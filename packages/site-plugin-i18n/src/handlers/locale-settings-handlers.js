import { getOrSeedLocaleSetting, serializeLocaleSetting } from "../server/locale-store.js";
import { resolveLocaleMeta } from "../config.js";

/**
 * Locale management API handlers.
 *
 * All handlers follow site-core's signature:
 *   async (request, params, context) => Response
 * with context = { connectDB, models }.
 *
 * Each handler closes over the static plugin config (passed in by
 * the factory in server.js) so it can seed the LocaleSetting doc on
 * first read without re-importing the plugin.
 */

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

function getModel(models) {
  return models?.LocaleSetting ?? null;
}

/**
 * GET /api/i18n/locales — public endpoint, also used by the LanguageSwitcher
 * block at runtime so it always renders the live list.
 *
 * Falls back to the static config if the DB is unreachable so the
 * site keeps rendering during a partial outage.
 */
export function makeListLocalesHandler(seed) {
  return async function listLocalesHandler(_request, _params, ctx) {
    try {
      await ctx.connectDB();
      const LocaleSetting = getModel(ctx.models);
      const doc = await getOrSeedLocaleSetting(LocaleSetting, seed);
      const view = serializeLocaleSetting(doc);
      return json({
        locales: view.locales.map((l) => l.code),
        localesDetailed: view.locales,
        defaultLocale: view.defaultLocale,
        localeMeta: seed.localeMeta || {},
        fallbackStrategy: seed.fallbackStrategy || "default-locale",
      });
    } catch (err) {
      console.error("[i18n] listLocales falling back to seed:", err.message);
      return json({
        locales: seed.locales || [],
        localesDetailed: (seed.locales || []).map((code) => {
          const meta = resolveLocaleMeta(code, seed.localeMeta || {});
          return { code, label: meta.label, nativeLabel: meta.nativeLabel, dir: meta.dir, enabled: true };
        }),
        defaultLocale: seed.defaultLocale || null,
        localeMeta: seed.localeMeta || {},
        fallbackStrategy: seed.fallbackStrategy || "default-locale",
      });
    }
  };
}

/**
 * POST /api/i18n/locales
 * Body: { code, label?, nativeLabel?, dir? }
 *
 * Add a new locale to the supported list. Auto-fills label/dir from
 * the built-in DEFAULT_LOCALE_META registry if the caller doesn't
 * provide them.
 */
export function makeAddLocaleHandler(seed) {
  return async function addLocaleHandler(request, _params, ctx) {
    await ctx.connectDB();
    const LocaleSetting = getModel(ctx.models);
    if (!LocaleSetting) return json({ error: "LocaleSetting model not registered" }, { status: 500 });

    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, { status: 400 }); }

    const code = String(body?.code || "").trim().toLowerCase();
    if (!code) return json({ error: "code is required" }, { status: 400 });
    if (!/^[a-z]{2}(-[a-z0-9]{2,8})?$/i.test(code)) {
      return json({ error: "code must look like 'en' or 'pt-br'" }, { status: 400 });
    }

    const doc = await getOrSeedLocaleSetting(LocaleSetting, seed);
    if (doc.locales.some((l) => l.code === code)) {
      return json({ error: `Locale "${code}" already exists` }, { status: 409 });
    }

    const meta = resolveLocaleMeta(code, seed.localeMeta || {});
    doc.locales.push({
      code,
      label: body.label || meta.label || code,
      nativeLabel: body.nativeLabel || meta.nativeLabel || meta.label || code,
      dir: body.dir || meta.dir || "ltr",
      enabled: true,
    });
    await doc.save();

    return json({ data: serializeLocaleSetting(doc) }, { status: 201 });
  };
}

/**
 * PATCH /api/i18n/locales/:code
 * Body: { label?, nativeLabel?, dir?, enabled? }
 *
 * Update the metadata for an existing locale. The code itself is
 * immutable — to "rename" a locale, delete it and add a new one
 * (which keeps the existing per-locale documents safe).
 */
export function makeUpdateLocaleHandler(seed) {
  return async function updateLocaleHandler(request, params, ctx) {
    await ctx.connectDB();
    const LocaleSetting = getModel(ctx.models);
    if (!LocaleSetting) return json({ error: "LocaleSetting model not registered" }, { status: 500 });

    const code = String(params?.code || "").toLowerCase();
    if (!code) return json({ error: "code is required" }, { status: 400 });

    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, { status: 400 }); }

    const doc = await getOrSeedLocaleSetting(LocaleSetting, seed);
    const entry = doc.locales.find((l) => l.code === code);
    if (!entry) return json({ error: `Locale "${code}" not found` }, { status: 404 });

    if (typeof body.label === "string") entry.label = body.label;
    if (typeof body.nativeLabel === "string") entry.nativeLabel = body.nativeLabel;
    if (body.dir === "ltr" || body.dir === "rtl") entry.dir = body.dir;
    if (typeof body.enabled === "boolean") entry.enabled = body.enabled;
    await doc.save();

    return json({ data: serializeLocaleSetting(doc) });
  };
}

/**
 * DELETE /api/i18n/locales/:code
 *
 * Refuses to delete the default locale (caller must set a different
 * default first). Existing Page/Global documents tagged with the
 * deleted locale are *not* removed — they're just hidden from the
 * editor's locale dropdown until the locale is re-added.
 */
export function makeDeleteLocaleHandler(seed) {
  return async function deleteLocaleHandler(_request, params, ctx) {
    await ctx.connectDB();
    const LocaleSetting = getModel(ctx.models);
    if (!LocaleSetting) return json({ error: "LocaleSetting model not registered" }, { status: 500 });

    const code = String(params?.code || "").toLowerCase();
    if (!code) return json({ error: "code is required" }, { status: 400 });

    const doc = await getOrSeedLocaleSetting(LocaleSetting, seed);
    if (doc.defaultLocale === code) {
      return json(
        { error: `Cannot delete the default locale. Set a different default first.` },
        { status: 409 },
      );
    }

    const before = doc.locales.length;
    doc.locales = doc.locales.filter((l) => l.code !== code);
    if (doc.locales.length === before) {
      return json({ error: `Locale "${code}" not found` }, { status: 404 });
    }
    await doc.save();

    // Surface a soft warning if there are still per-locale docs around.
    const Page = ctx.models?.Page;
    const Global = ctx.models?.Global;
    const ContentItem = ctx.models?.ContentItem;
    const orphans = {
      pages: Page ? await Page.countDocuments({ locale: code }) : 0,
      globals: Global ? await Global.countDocuments({ locale: code }) : 0,
      contentItems: ContentItem ? await ContentItem.countDocuments({ locale: code }) : 0,
    };

    return json({ data: serializeLocaleSetting(doc), orphans });
  };
}

/**
 * POST /api/i18n/locales/default
 * Body: { code }
 */
export function makeSetDefaultLocaleHandler(seed) {
  return async function setDefaultLocaleHandler(request, _params, ctx) {
    await ctx.connectDB();
    const LocaleSetting = getModel(ctx.models);
    if (!LocaleSetting) return json({ error: "LocaleSetting model not registered" }, { status: 500 });

    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, { status: 400 }); }

    const code = String(body?.code || "").toLowerCase();
    if (!code) return json({ error: "code is required" }, { status: 400 });

    const doc = await getOrSeedLocaleSetting(LocaleSetting, seed);
    if (!doc.locales.some((l) => l.code === code)) {
      return json({ error: `Locale "${code}" is not in the supported list` }, { status: 400 });
    }
    doc.defaultLocale = code;
    await doc.save();

    return json({ data: serializeLocaleSetting(doc) });
  };
}

/* --------------------------- Coverage matrix --------------------------- */

/**
 * GET /api/i18n/coverage
 *
 * Aggregates Pages and Globals into translation groups so the admin
 * UI can render a "which locales does each piece of content exist in"
 * matrix in one fetch.
 *
 * Pages without a translationGroupId are grouped by their slug as a
 * fallback (legacy data) so they still appear in the matrix.
 */
export function makeCoverageHandler(seed) {
  return async function coverageHandler(_request, _params, ctx) {
    await ctx.connectDB();
    const LocaleSetting = getModel(ctx.models);
    const Page = ctx.models?.Page;
    const Global = ctx.models?.Global;
    const ContentItem = ctx.models?.ContentItem;
    const ContentType = ctx.models?.ContentType;

    const settingsDoc = await getOrSeedLocaleSetting(LocaleSetting, seed);
    const settings = serializeLocaleSetting(settingsDoc);

    const pageGroups = Page ? await aggregateGroups(Page, "slug") : [];
    const globalGroups = Global ? await aggregateGroups(Global, "key") : [];
    const contentItemGroups = ContentItem
      ? await aggregateContentItemGroups(ContentItem, ContentType)
      : [];

    return json({
      locales: settings.locales,
      defaultLocale: settings.defaultLocale,
      pages: pageGroups,
      globals: globalGroups,
      contentItems: contentItemGroups,
    });
  };
}

async function aggregateGroups(Model, slugField) {
  const docs = await Model.find({})
    .select(`_id ${slugField} title locale published translationGroupId updatedAt`)
    .lean();

  const byGroup = new Map();
  for (const doc of docs) {
    // Fall back to slug as a stable group key for legacy docs.
    const groupKey = doc.translationGroupId || `__${slugField}:${doc[slugField]}`;
    if (!byGroup.has(groupKey)) {
      byGroup.set(groupKey, {
        groupId: doc.translationGroupId || null,
        slug: doc[slugField],
        title: doc.title || doc[slugField],
        siblings: [],
      });
    }
    const entry = byGroup.get(groupKey);
    entry.siblings.push({
      id: String(doc._id),
      slug: doc[slugField],
      locale: doc.locale || null,
      published: !!doc.published,
      updatedAt: doc.updatedAt,
    });
    // Prefer the most recent title for the group label.
    if (doc.title && (!entry.title || doc.updatedAt > entry.updatedAt)) {
      entry.title = doc.title;
      entry.updatedAt = doc.updatedAt;
    }
  }

  return [...byGroup.values()].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
}

/**
 * ContentItems need their own aggregator because:
 *   1. The "natural" group fallback key is `(contentType, slug)` not
 *      just slug — two different types can have an item with the same
 *      slug and they should NOT be folded into the same row.
 *   2. The matrix needs the contentType slug/name so the UI can show
 *      a friendlier label and link into the right editor screen.
 */
async function aggregateContentItemGroups(ContentItem, ContentType) {
  const docs = await ContentItem.find({})
    .select("_id slug title locale published translationGroupId contentType updatedAt")
    .lean();

  // Pre-load content types in a single query so we don't N+1 the lookup.
  const typeIds = [...new Set(docs.map((d) => String(d.contentType)).filter(Boolean))];
  const types = ContentType
    ? await ContentType.find({ _id: { $in: typeIds } })
        .select("_id name slug urlPrefix")
        .lean()
    : [];
  const typeById = new Map(types.map((t) => [String(t._id), t]));

  const byGroup = new Map();
  for (const doc of docs) {
    const typeId = String(doc.contentType);
    const groupKey = doc.translationGroupId || `__type:${typeId}:slug:${doc.slug}`;
    if (!byGroup.has(groupKey)) {
      const t = typeById.get(typeId);
      byGroup.set(groupKey, {
        groupId: doc.translationGroupId || null,
        slug: doc.slug,
        title: doc.title || doc.slug,
        contentType: t
          ? { id: typeId, name: t.name, slug: t.slug, urlPrefix: t.urlPrefix }
          : { id: typeId, name: null, slug: null, urlPrefix: null },
        siblings: [],
      });
    }
    const entry = byGroup.get(groupKey);
    entry.siblings.push({
      id: String(doc._id),
      slug: doc.slug,
      locale: doc.locale || null,
      published: !!doc.published,
      updatedAt: doc.updatedAt,
    });
    if (doc.title && (!entry.title || doc.updatedAt > entry.updatedAt)) {
      entry.title = doc.title;
      entry.updatedAt = doc.updatedAt;
    }
  }

  return [...byGroup.values()].sort((a, b) => {
    const byType = (a.contentType?.name || "").localeCompare(b.contentType?.name || "");
    if (byType !== 0) return byType;
    return (a.title || "").localeCompare(b.title || "");
  });
}
