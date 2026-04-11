import crypto from "node:crypto";

/**
 * Lifecycle hooks that patch Page/ContentItem behavior for i18n.
 *
 * These are wired up in server.js as part of i18nPluginServer.hooks.
 * They assume the core Page/ContentItem schemas will accept extra
 * fields (`locale`, `translationGroupId`) — which Mongoose does by
 * default unless `strict: true` is set and the fields aren't in the
 * schema. For strict schemas, client sites should extend Page via
 * the plugin-models pattern.
 */

function newGroupId() {
  return crypto.randomUUID();
}

/**
 * beforePageSave — ensure every page has a locale and a translationGroupId.
 *
 * Site-core invokes this hook with `{ data, action }` where `data` is
 * the partial document that's about to be persisted (full doc on
 * "create", patch object on "update"). The hook must return the
 * (possibly mutated) data object.
 *
 * - On create: fill missing locale with defaultLocale, generate a
 *   translationGroupId if absent.
 * - On update: only set locale/translationGroupId if they appear in
 *   the patch (don't add them to every PATCH unrelatedly).
 */
export function ensureLocaleBeforeSave(defaultLocale) {
  return async ({ data, action }) => {
    if (!data) return data;
    if (action === "create") {
      if (!data.locale) data.locale = defaultLocale;
      if (!data.translationGroupId) data.translationGroupId = newGroupId();
    }
    return data;
  };
}

/**
 * beforeContentItemSave — ensure every ContentItem has a locale and a
 * translationGroupId. Same shape as ensureLocaleBeforeSave for pages.
 *
 * On create the locale defaults to the plugin's defaultLocale and a
 * fresh group id is generated. On update we leave both alone unless
 * the patch already touches them — that way unrelated PATCHes don't
 * accidentally re-tag a translation.
 */
export function ensureContentItemLocaleBeforeSave(defaultLocale) {
  return async ({ data, action }) => {
    if (!data) return data;
    if (action === "create") {
      if (!data.locale) data.locale = defaultLocale;
      if (!data.translationGroupId) data.translationGroupId = newGroupId();
    }
    return data;
  };
}

/**
 * beforeGlobalSave — same logic as page save, but for Global docs.
 *
 * Globals (header/footer) get one record per locale just like pages.
 * On first save of a Global with no locale (legacy data), we fill in
 * the default locale so the unique compound index works.
 */
export function ensureGlobalLocaleBeforeSave(defaultLocale) {
  return async ({ data, action }) => {
    if (!data) return data;
    // Globals are typically updated, not created, so we run the
    // backfill on every action where the locale is missing.
    if (data.locale === undefined || data.locale === null) {
      data.locale = defaultLocale;
    }
    if (!data.translationGroupId) {
      data.translationGroupId = newGroupId();
    }
    return data;
  };
}

/**
 * afterDbConnect — backfill locale on legacy pages and globals.
 *
 * Runs once on the first DB connect after the i18n plugin is
 * installed. Idempotent: documents that already have a locale are
 * left alone. Lets a site adopt the plugin without writing a custom
 * migration.
 *
 * The hook receives `{ models }` from site-core, which holds the
 * models registered against the consuming site's mongoose instance.
 * NEVER reach for `mongoose.models.X` here — the plugin's mongoose
 * copy doesn't share that registry, so it would return `undefined`.
 */
export function backfillLegacyLocales(defaultLocale) {
  return async ({ models } = {}) => {
    const Page = models?.Page;
    const Global = models?.Global;
    const ContentItem = models?.ContentItem;

    if (Page) {
      const pageRes = await Page.updateMany(
        { $or: [{ locale: null }, { locale: { $exists: false } }] },
        { $set: { locale: defaultLocale } },
      );
      const pagesNeedingGroup = await Page.find(
        { $or: [{ translationGroupId: null }, { translationGroupId: { $exists: false } }] },
      ).select("_id");
      for (const p of pagesNeedingGroup) {
        await Page.updateOne({ _id: p._id }, { $set: { translationGroupId: newGroupId() } });
      }
      if (pageRes.modifiedCount || pagesNeedingGroup.length) {
        console.log(
          `[i18n] backfilled locale=${defaultLocale} on ${pageRes.modifiedCount} legacy pages, assigned groupIds to ${pagesNeedingGroup.length} pages`,
        );
      }
    }

    if (Global) {
      const globalRes = await Global.updateMany(
        { $or: [{ locale: null }, { locale: { $exists: false } }] },
        { $set: { locale: defaultLocale } },
      );
      const globalsNeedingGroup = await Global.find(
        { $or: [{ translationGroupId: null }, { translationGroupId: { $exists: false } }] },
      ).select("_id");
      for (const g of globalsNeedingGroup) {
        await Global.updateOne({ _id: g._id }, { $set: { translationGroupId: newGroupId() } });
      }
      if (globalRes.modifiedCount || globalsNeedingGroup.length) {
        console.log(
          `[i18n] backfilled locale=${defaultLocale} on ${globalRes.modifiedCount} legacy globals, assigned groupIds to ${globalsNeedingGroup.length} globals`,
        );
      }
    }

    if (ContentItem) {
      const itemRes = await ContentItem.updateMany(
        { $or: [{ locale: null }, { locale: { $exists: false } }] },
        { $set: { locale: defaultLocale } },
      );
      const itemsNeedingGroup = await ContentItem.find(
        { $or: [{ translationGroupId: null }, { translationGroupId: { $exists: false } }] },
      ).select("_id");
      for (const it of itemsNeedingGroup) {
        await ContentItem.updateOne({ _id: it._id }, { $set: { translationGroupId: newGroupId() } });
      }
      if (itemRes.modifiedCount || itemsNeedingGroup.length) {
        console.log(
          `[i18n] backfilled locale=${defaultLocale} on ${itemRes.modifiedCount} legacy content items, assigned groupIds to ${itemsNeedingGroup.length} items`,
        );
      }
    }
  };
}

/**
 * Utility used by handlers: produce the payload for a new page that
 * is a locale-sibling of an existing page.
 *
 * The caller is responsible for persisting the returned object via
 * the Page model — this function is pure so it can be unit-tested.
 */
export function buildLocaleSibling(source, targetLocale) {
  if (!source) throw new Error("buildLocaleSibling: source is required");
  if (!targetLocale) throw new Error("buildLocaleSibling: targetLocale is required");

  const base = typeof source.toObject === "function" ? source.toObject() : { ...source };

  delete base._id;
  delete base.createdAt;
  delete base.updatedAt;
  delete base.__v;

  return {
    ...base,
    locale: targetLocale,
    translationGroupId: source.translationGroupId ?? newGroupId(),
    published: false, // always start the sibling as draft
  };
}
