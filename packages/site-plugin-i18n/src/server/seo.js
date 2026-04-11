/**
 * SEO helpers for multilingual sites.
 *
 * Two pure-server functions, both safe to import in any RSC or
 * generateMetadata context:
 *
 *   getLocaleAlternates() — returns a Next.js metadata-shaped object
 *     populated with hreflang alternates, a canonical URL, and
 *     og:locale fields, derived from the document's translationGroupId.
 *
 *   buildI18nSitemap() — returns a MetadataRoute.Sitemap-compatible
 *     array with `alternates.languages` populated for every URL.
 *
 * Both helpers are model-driven (Page, ContentItem, ContentType,
 * LocaleSetting) so they automatically reflect locales added or
 * removed from the admin UI — there's nothing to redeploy when the
 * locale list changes.
 *
 * URL convention used by both helpers (matches the middleware-driven
 * routing in the catch-all):
 *
 *   default locale → no prefix      (/about, /blog/hello-world)
 *   other locales  → /<code> prefix (/ar/about, /ar/blog/hello-world)
 *
 * Sites that adopt a different convention (e.g. always-prefixed, or
 * subdomain per locale) can pass a custom `urlBuilder` to override.
 */

/* ----------------------------- helpers ----------------------------- */

/** Trim trailing slash so we can safely concat segments. */
function trimTrailingSlash(s) {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

/**
 * Extract a stringified ObjectId from either a raw id, an ObjectId, or
 * a populated subdocument. Without this, callers that pass a doc that
 * was loaded with `.populate("contentType")` would silently corrupt the
 * generated URLs (`String({...})` → `"[object Object]"`).
 */
function toIdString(ref) {
  if (!ref) return null;
  if (typeof ref === "string") return ref;
  if (ref._id) return String(ref._id);
  return String(ref);
}

/** Convert a BCP-47 code into Facebook's `og:locale` format. */
function toOgLocale(code) {
  if (!code) return null;
  // "en" → "en", "pt-br" → "pt_BR"
  const [lang, region] = code.toLowerCase().split("-");
  if (!region) return lang;
  return `${lang}_${region.toUpperCase()}`;
}

/**
 * Default URL builder for the conventions used by the starter
 * template's middleware + catch-all route.
 *
 *   home page (slug === "home") → "/" or "/<locale>"
 *   page                        → "/<slug>" or "/<locale>/<slug>"
 *   content item                → "/<urlPrefix>/<slug>" or "/<locale>/<urlPrefix>/<slug>"
 */
function defaultUrlBuilder({ baseUrl, locale, defaultLocale, kind, slug, contentType }) {
  const root = trimTrailingSlash(baseUrl || "");
  const localePrefix = locale === defaultLocale ? "" : `/${locale}`;

  if (kind === "page") {
    if (slug === "home") return root + (localePrefix || "/");
    return `${root}${localePrefix}/${slug}`;
  }

  if (kind === "content") {
    const prefix = contentType?.urlPrefix || "";
    const cleanPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;
    return `${root}${localePrefix}${cleanPrefix}/${slug}`;
  }

  return root;
}

/* ----------------------- getLocaleAlternates ----------------------- */

/**
 * Build a Next.js `metadata` partial with hreflang alternates and og:locale
 * for a given document.
 *
 * Returns an object that can be spread into `generateMetadata`'s return
 * value. Always returns *something* useful — if the doc has no
 * translationGroupId, the helper falls back to a single self-referential
 * canonical so generateMetadata never crashes.
 *
 * @param {object} args
 * @param {object} args.models           - mongoose models from siteConfig.getModels()
 * @param {"page"|"content"} args.kind   - which collection to look in
 * @param {object} args.doc              - the resolved doc (must include slug, locale, translationGroupId)
 * @param {string} args.baseUrl          - absolute origin, e.g. "https://acme.com"
 * @param {string} [args.defaultLocale]  - override the LocaleSetting default
 * @param {Function} [args.urlBuilder]   - replace the default routing convention
 *
 * @returns {Promise<object>} `{ alternates: { canonical, languages }, openGraph: { locale, alternateLocale } }`
 */
export async function getLocaleAlternates({
  models,
  kind,
  doc,
  baseUrl,
  defaultLocale: defaultLocaleOverride,
  urlBuilder = defaultUrlBuilder,
}) {
  if (!doc || !baseUrl) return {};

  const LocaleSetting = models?.LocaleSetting;
  const settingsDoc = LocaleSetting
    ? await LocaleSetting.findOne({ key: "singleton" }).lean()
    : null;

  const enabled = (settingsDoc?.locales || []).filter((l) => l.enabled !== false);
  const defaultLocale =
    defaultLocaleOverride || settingsDoc?.defaultLocale || doc.locale || "en";

  // Build the list of sibling docs in the same translation group, so
  // every hreflang line points at a real URL — not a 404.
  let siblings = [];
  if (doc.translationGroupId) {
    const Model = kind === "content" ? models?.ContentItem : models?.Page;
    if (Model) {
      siblings = await Model.find({
        translationGroupId: doc.translationGroupId,
        published: true,
      })
        .select("slug locale contentType")
        .lean();
    }
  }

  // Always include the current doc itself, even if the group lookup
  // somehow returned nothing — guarantees the canonical is correct.
  if (!siblings.find((s) => String(s._id) === String(doc._id))) {
    siblings.push({
      _id: doc._id,
      slug: doc.slug,
      locale: doc.locale,
      contentType: doc.contentType,
    });
  }

  // For ContentItems we need each sibling's contentType urlPrefix.
  // Pre-load them in one query to avoid N+1.
  let contentTypeById = new Map();
  if (kind === "content") {
    const ContentType = models?.ContentType;
    if (ContentType) {
      const ids = [...new Set(siblings.map((s) => toIdString(s.contentType)).filter(Boolean))];
      const cts = await ContentType.find({ _id: { $in: ids } })
        .select("_id urlPrefix slug")
        .lean();
      contentTypeById = new Map(cts.map((c) => [String(c._id), c]));
    }
  }

  // Map locale → URL. Skip siblings whose locale isn't in the live
  // enabled list — they're orphans from a removed locale and pointing
  // search engines at them would give a 404.
  const enabledCodes = new Set(enabled.map((l) => l.code));
  const languages = {};
  for (const sib of siblings) {
    if (!sib.locale || !enabledCodes.has(sib.locale)) continue;
    const ct = sib.contentType ? contentTypeById.get(toIdString(sib.contentType)) : null;
    languages[sib.locale] = urlBuilder({
      baseUrl,
      locale: sib.locale,
      defaultLocale,
      kind,
      slug: sib.slug,
      contentType: ct,
    });
  }

  // x-default points at whichever sibling matches the default locale,
  // or the current doc if no default-locale sibling exists.
  const xDefault = languages[defaultLocale] || languages[doc.locale];
  if (xDefault) languages["x-default"] = xDefault;

  // Self-referential canonical — Google's recommendation for international
  // pages. Each locale URL canonicalizes to itself, NOT to the default.
  const canonical =
    languages[doc.locale] ||
    urlBuilder({
      baseUrl,
      locale: doc.locale || defaultLocale,
      defaultLocale,
      kind,
      slug: doc.slug,
      contentType: doc.contentType ? contentTypeById.get(toIdString(doc.contentType)) : null,
    });

  // Open Graph locale + alternates for social previews.
  const ogLocale = toOgLocale(doc.locale || defaultLocale);
  const ogAlternates = Object.keys(languages)
    .filter((code) => code !== "x-default" && code !== doc.locale)
    .map(toOgLocale)
    .filter(Boolean);

  return {
    alternates: { canonical, languages },
    openGraph: {
      locale: ogLocale,
      ...(ogAlternates.length ? { alternateLocale: ogAlternates } : {}),
    },
  };
}

/* ------------------------- buildI18nSitemap ------------------------- */

/**
 * Build a sitemap with hreflang alternates for every Page and
 * ContentItem in the database.
 *
 * Returns a `MetadataRoute.Sitemap`-compatible array. Drop straight
 * into `app/sitemap.js`:
 *
 *   import { buildI18nSitemap } from "@premast/site-plugin-i18n/server";
 *   import { siteConfig } from "@/site.config";
 *
 *   export default async function sitemap() {
 *     const connectDB = await siteConfig.getConnectDB();
 *     await connectDB();
 *     const models = await siteConfig.getModels();
 *     return buildI18nSitemap({ models, baseUrl: process.env.SITE_URL });
 *   }
 *
 * Documents are grouped by translationGroupId so each entry's
 * `alternates.languages` map points at every published locale of the
 * same content. Search engines treat this as the strongest possible
 * hreflang signal.
 */
export async function buildI18nSitemap({
  models,
  baseUrl,
  defaultLocale: defaultLocaleOverride,
  urlBuilder = defaultUrlBuilder,
}) {
  if (!baseUrl) {
    console.warn(
      "[premast/i18n] buildI18nSitemap called without baseUrl — set SITE_URL in env so sitemap.xml emits absolute URLs.",
    );
    return [];
  }

  const LocaleSetting = models?.LocaleSetting;
  const Page = models?.Page;
  const ContentItem = models?.ContentItem;
  const ContentType = models?.ContentType;

  const settingsDoc = LocaleSetting
    ? await LocaleSetting.findOne({ key: "singleton" }).lean()
    : null;
  const enabledCodes = new Set(
    (settingsDoc?.locales || []).filter((l) => l.enabled !== false).map((l) => l.code),
  );
  const defaultLocale =
    defaultLocaleOverride || settingsDoc?.defaultLocale || "en";

  const entries = [];

  // Pre-load all content types so the URL builder can resolve urlPrefix.
  const allTypes = ContentType
    ? await ContentType.find({}).select("_id urlPrefix slug").lean()
    : [];
  const contentTypeById = new Map(allTypes.map((c) => [String(c._id), c]));

  // ---- Pages ----
  if (Page) {
    const pages = await Page.find({ published: true })
      .select("slug locale translationGroupId updatedAt")
      .lean();
    addEntries({
      docs: pages,
      kind: "page",
      groupKey: (d) => d.translationGroupId || `__page:${d.slug}`,
      entries,
      enabledCodes,
      defaultLocale,
      baseUrl,
      urlBuilder,
    });
  }

  // ---- ContentItems ----
  if (ContentItem) {
    const items = await ContentItem.find({ published: true })
      .select("slug locale translationGroupId contentType updatedAt")
      .lean();
    addEntries({
      docs: items,
      kind: "content",
      // Group by (contentType, slug) for legacy items missing a groupId
      // so we don't merge unrelated articles that happen to share a slug.
      groupKey: (d) => d.translationGroupId || `__content:${String(d.contentType)}:${d.slug}`,
      contentTypeById,
      entries,
      enabledCodes,
      defaultLocale,
      baseUrl,
      urlBuilder,
    });
  }

  return entries;
}

/**
 * Internal: collapse a flat doc list into one sitemap entry per
 * translation group, with `alternates.languages` populated.
 */
function addEntries({
  docs,
  kind,
  groupKey,
  contentTypeById,
  entries,
  enabledCodes,
  defaultLocale,
  baseUrl,
  urlBuilder,
}) {
  const byGroup = new Map();
  for (const doc of docs) {
    if (!doc.locale || !enabledCodes.has(doc.locale)) continue;
    const key = groupKey(doc);
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(doc);
  }

  for (const group of byGroup.values()) {
    // Pick the default-locale doc as the entry's primary URL when
    // available; falls back to whichever locale was authored first.
    const primary = group.find((d) => d.locale === defaultLocale) || group[0];
    const ct =
      kind === "content" && contentTypeById
        ? contentTypeById.get(toIdString(primary.contentType))
        : null;

    const languages = {};
    for (const sib of group) {
      const sibCt =
        kind === "content" && contentTypeById
          ? contentTypeById.get(toIdString(sib.contentType))
          : null;
      languages[sib.locale] = urlBuilder({
        baseUrl,
        locale: sib.locale,
        defaultLocale,
        kind,
        slug: sib.slug,
        contentType: sibCt,
      });
    }
    if (languages[defaultLocale]) {
      languages["x-default"] = languages[defaultLocale];
    }

    entries.push({
      url: urlBuilder({
        baseUrl,
        locale: primary.locale,
        defaultLocale,
        kind,
        slug: primary.slug,
        contentType: ct,
      }),
      lastModified: primary.updatedAt || new Date(),
      alternates: { languages },
    });
  }
}
