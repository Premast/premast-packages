import { uiMessageSchema } from "./models/UiMessage.js";
import { localeSettingSchema } from "./models/LocaleSetting.js";
import {
  duplicateToLocaleHandler,
  duplicateGlobalToLocaleHandler,
  duplicateContentItemToLocaleHandler,
  getTranslationGroupHandler,
  getGlobalTranslationGroupHandler,
  getContentItemTranslationGroupHandler,
} from "./handlers/i18n-handlers.js";
import {
  makeListLocalesHandler,
  makeAddLocaleHandler,
  makeUpdateLocaleHandler,
  makeDeleteLocaleHandler,
  makeSetDefaultLocaleHandler,
  makeCoverageHandler,
} from "./handlers/locale-settings-handlers.js";
import {
  ensureLocaleBeforeSave,
  ensureGlobalLocaleBeforeSave,
  ensureContentItemLocaleBeforeSave,
  backfillLegacyLocales,
} from "./hooks/i18n-hooks.js";
import { getOrSeedLocaleSetting } from "./server/locale-store.js";

// Re-exported SEO + request helpers — these are pure server modules,
// safe to import from any RSC, layout, or generateMetadata function in
// a consuming site. Co-located here so client sites only need to know
// about a single import path: "@premast/site-plugin-i18n/server".
export { getLocaleAlternates, buildI18nSitemap } from "./server/seo.js";
export { getRequestLocale } from "./server/request-locale.js";

/**
 * Server-only i18n plugin extensions.
 *
 * Usage in site.config.js:
 *
 *   import { i18nPlugin } from "@premast/site-plugin-i18n";
 *   import { i18nPluginServer } from "@premast/site-plugin-i18n/server";
 *
 *   const i18n = i18nPlugin({ locales: ["en", "ar"], defaultLocale: "en" });
 *   const serverExt = i18nPluginServer(i18n.config);
 *
 *   createSiteConfig({
 *     plugins: [{ ...i18n, ...serverExt }],
 *   });
 *
 * Once installed, the locale list lives in the LocaleSetting collection
 * and is editable from /admin/translations. The static `locales` array
 * passed to i18nPlugin() is used as the seed on first connect only.
 */
export function i18nPluginServer(config = {}) {
  const { defaultLocale = "en" } = config;

  return {
    __isPremastPluginServer: true,
    apiRoutes: [
      // Pages / Globals / ContentItems duplication + group lookups
      { path: "i18n/duplicate", method: "POST", handler: duplicateToLocaleHandler },
      { path: "i18n/duplicate-global", method: "POST", handler: duplicateGlobalToLocaleHandler },
      { path: "i18n/duplicate-content-item", method: "POST", handler: duplicateContentItemToLocaleHandler },
      { path: "i18n/group/:id", method: "GET", handler: getTranslationGroupHandler },
      { path: "i18n/group-global/:id", method: "GET", handler: getGlobalTranslationGroupHandler },
      { path: "i18n/group-content-item/:id", method: "GET", handler: getContentItemTranslationGroupHandler },

      // Locale management (DB-backed) — these supersede the old read-only
      // /api/i18n/locales handler that returned the static config.
      { path: "i18n/locales", method: "GET", handler: makeListLocalesHandler(config) },
      { path: "i18n/locales", method: "POST", handler: makeAddLocaleHandler(config) },
      { path: "i18n/locales/default", method: "POST", handler: makeSetDefaultLocaleHandler(config) },
      { path: "i18n/locales/:code", method: "PATCH", handler: makeUpdateLocaleHandler(config) },
      { path: "i18n/locales/:code", method: "DELETE", handler: makeDeleteLocaleHandler(config) },

      // Translation coverage matrix for the admin page
      { path: "i18n/coverage", method: "GET", handler: makeCoverageHandler(config) },
    ],

    models: {
      UiMessage: uiMessageSchema,
      LocaleSetting: localeSettingSchema,
    },

    hooks: {
      beforePageSave: ensureLocaleBeforeSave(defaultLocale),
      beforeGlobalSave: ensureGlobalLocaleBeforeSave(defaultLocale),
      beforeContentItemSave: ensureContentItemLocaleBeforeSave(defaultLocale),
      afterDbConnect: async (ctx) => {
        // Run the legacy backfill first so existing pages get a locale.
        await backfillLegacyLocales(defaultLocale)(ctx);
        // Then make sure the LocaleSetting singleton exists. This is the
        // one-and-only place where the static seed is consulted; from
        // here on the DB doc is the source of truth.
        try {
          await getOrSeedLocaleSetting(ctx?.models?.LocaleSetting, config);
        } catch (err) {
          console.error("[i18n] failed to seed LocaleSetting:", err.message);
        }
      },
    },
  };
}

// Fail loud when the factory is spread (or Object.assign'd) without being
// called first. Without these guards, `{ name: "i18n", ...i18nPluginServer }`
// silently yields `{ name: "i18n" }` — no routes, no models, no hooks —
// and the whole plugin becomes a no-op. See
// https://github.com/premast/premast-packages/issues for the incident
// that drove this guard.
const SPREAD_GUARD_MESSAGE =
  '[premast] i18nPluginServer is a factory — call it with your plugin config before spreading. Example:\n' +
  '  const i18n = i18nPlugin({ locales: ["en", "ar"], defaultLocale: "en" });\n' +
  '  // ...\n' +
  '  { name: "i18n", ...i18nPluginServer(i18n.config) }';

for (const key of ["apiRoutes", "models", "hooks"]) {
  Object.defineProperty(i18nPluginServer, key, {
    enumerable: true,
    configurable: true,
    get() {
      throw new Error(SPREAD_GUARD_MESSAGE);
    },
  });
}
