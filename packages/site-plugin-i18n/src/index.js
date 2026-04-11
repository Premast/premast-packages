import { createElement } from "react";
import { TranslationsAdminPage } from "./admin/TranslationsAdminPage.jsx";
import { LocaleRootField } from "./admin/LocaleRootField.jsx";
import { buildLanguageSwitcherBlock } from "./blocks/LanguageSwitcherBlock.jsx";

/**
 * @premast/site-plugin-i18n
 *
 * Adds multi-locale support to Puck pages and content items.
 *
 * Storage model: one document per (slug, locale) pair, linked by a
 * shared `translationGroupId`. This keeps block `render` functions
 * unchanged — blocks never need to know about locales.
 *
 * Import this factory in site.config.js. For server-only extensions
 * (models, API routes, hooks) also merge in `i18nPluginServer` from
 * `@premast/site-plugin-i18n/server`.
 */
export function i18nPlugin(options = {}) {
  const {
    locales = ["en"],
    defaultLocale = "en",
    localeMeta = {},
    fallbackStrategy = "default-locale", // "default-locale" | "404" | "nearest"
    showFallbackNotice = true,
  } = options;

  if (!Array.isArray(locales) || locales.length === 0) {
    throw new Error("[i18nPlugin] `locales` must be a non-empty array");
  }
  if (!locales.includes(defaultLocale)) {
    throw new Error(
      `[i18nPlugin] defaultLocale "${defaultLocale}" must be included in locales`,
    );
  }

  return {
    name: "i18n",
    version: "1.0.0",

    // Expose config so other parts of the app (layouts, middleware,
    // admin components) can read it without re-importing this plugin.
    config: {
      locales,
      defaultLocale,
      localeMeta,
      fallbackStrategy,
      showFallbackNotice,
    },

    // Adds a Locale selector at the Puck root level so editors can
    // see and change which locale this document represents.
    // translationGroupId is intentionally NOT exposed — it's managed
    // automatically by the beforePageSave hook.
    //
    // We use a `custom` field (not `select`) so the dropdown can fetch
    // the live locale list from /api/i18n/locales at render time.
    // Otherwise the options would be frozen at boot from the static
    // seed config and wouldn't reflect locales added/removed in the
    // Translations admin page until the dev server restarts.
    rootFields: {
      locale: {
        type: "custom",
        label: "Language",
        render: ({ value, onChange }) =>
          createElement(LocaleRootField, {
            value,
            onChange,
            seedLocales: locales,
            seedMeta: localeMeta,
          }),
      },
    },

    // Puck blocks contributed by this plugin. Currently just the
    // LanguageSwitcher, which closes over the plugin config so the
    // editor never has to re-enter the locale list.
    blocks: {
      LanguageSwitcher: buildLanguageSwitcherBlock({
        locales,
        localeMeta,
        defaultLocale,
      }),
    },

    // Dedicated category in the Puck left sidebar so editors can find
    // i18n-specific blocks without hunting through the component drawer.
    categories: {
      i18n: {
        title: "Translation",
        components: ["LanguageSwitcher"],
      },
    },

    adminPages: [
      {
        key: "i18n-translations",
        label: "Translations",
        icon: "GlobalOutlined",
        path: "/admin/translations",
        component: TranslationsAdminPage,
      },
    ],
  };
}
