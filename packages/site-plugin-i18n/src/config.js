/**
 * Locale metadata registry.
 *
 * Safe to import from both client and server code — contains no mongoose
 * or Puck dependencies.
 *
 * Client sites can extend this via the plugin factory options; unknown
 * locale codes fall back to defaults.
 */

export const DEFAULT_LOCALE_META = {
  en: { label: "English", nativeLabel: "English", dir: "ltr" },
  ar: { label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  fr: { label: "French", nativeLabel: "Français", dir: "ltr" },
  es: { label: "Spanish", nativeLabel: "Español", dir: "ltr" },
  de: { label: "German", nativeLabel: "Deutsch", dir: "ltr" },
  it: { label: "Italian", nativeLabel: "Italiano", dir: "ltr" },
  pt: { label: "Portuguese", nativeLabel: "Português", dir: "ltr" },
  tr: { label: "Turkish", nativeLabel: "Türkçe", dir: "ltr" },
  he: { label: "Hebrew", nativeLabel: "עברית", dir: "rtl" },
  fa: { label: "Persian", nativeLabel: "فارسی", dir: "rtl" },
  ur: { label: "Urdu", nativeLabel: "اردو", dir: "rtl" },
  ja: { label: "Japanese", nativeLabel: "日本語", dir: "ltr" },
  zh: { label: "Chinese", nativeLabel: "中文", dir: "ltr" },
};

export function resolveLocaleMeta(locale, overrides = {}) {
  return {
    label: locale,
    nativeLabel: locale,
    dir: "ltr",
    ...DEFAULT_LOCALE_META[locale],
    ...overrides[locale],
  };
}

export function buildLocaleOptions(locales, overrides = {}) {
  return locales.map((code) => {
    const meta = resolveLocaleMeta(code, overrides);
    return {
      label: `${meta.nativeLabel} (${code})`,
      value: code,
    };
  });
}

export function getLocaleDir(locale, overrides = {}) {
  return resolveLocaleMeta(locale, overrides).dir;
}
