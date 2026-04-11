import { resolveLocaleMeta } from "../config.js";

/**
 * Read/write helpers for the LocaleSetting singleton.
 *
 * Every API handler in the plugin goes through these instead of
 * touching mongoose directly, so the document shape lives in one
 * place and the seed-on-first-read logic is consistent.
 */

const SINGLETON_KEY = "singleton";

/**
 * Materialise a single LocaleSetting doc, seeding it from the static
 * plugin config if the collection is empty.
 *
 * @param {*} LocaleSetting  mongoose model from context.models
 * @param {object} seed      { locales, defaultLocale, localeMeta } from i18nPlugin()
 */
export async function getOrSeedLocaleSetting(LocaleSetting, seed = {}) {
  if (!LocaleSetting) return null;

  let doc = await LocaleSetting.findOne({ key: SINGLETON_KEY });
  if (doc) return doc;

  // First boot: seed from the plugin factory config so existing sites
  // don't have to do anything to migrate.
  const seedLocales = (seed.locales ?? ["en"]).map((code) => {
    const meta = resolveLocaleMeta(code, seed.localeMeta || {});
    return {
      code,
      label: meta.label || code,
      nativeLabel: meta.nativeLabel || meta.label || code,
      dir: meta.dir || "ltr",
      enabled: true,
    };
  });

  doc = await LocaleSetting.create({
    key: SINGLETON_KEY,
    locales: seedLocales,
    defaultLocale: seed.defaultLocale || seedLocales[0]?.code || "en",
  });
  return doc;
}

/**
 * Convenience: return a plain JSON-friendly view of the active locales.
 * Used by the public /api/i18n/locales endpoint and by the admin UI.
 */
export function serializeLocaleSetting(doc) {
  if (!doc) return { locales: [], defaultLocale: null };
  return {
    locales: (doc.locales || []).map((l) => ({
      code: l.code,
      label: l.label,
      nativeLabel: l.nativeLabel,
      dir: l.dir,
      enabled: l.enabled !== false,
    })),
    defaultLocale: doc.defaultLocale,
  };
}
