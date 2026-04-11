/**
 * Request-scoped locale resolution.
 *
 * Single source of truth for "what locale is the current request?"
 * so client sites don't have to duplicate the cookie/header lookup
 * across layout, page, and sitemap files.
 *
 * Resolution order (highest priority first):
 *   1. `x-premast-locale` request header — set by the locale-aware
 *      middleware when the URL starts with /<code>/...
 *   2. `premast_locale` cookie — set by the LanguageSwitcher block when
 *      using cookie or query strategies
 *   3. The defaultLocale from the LocaleSetting collection
 *   4. The hard-coded fallback passed by the caller (defaults to "en")
 *
 * MUST be called from a Server Component or `generateMetadata`. The
 * `next/headers` API throws if invoked outside a request scope.
 */

const LOCALE_COOKIE = "premast_locale";
const HEADER_NAME = "x-premast-locale";

/**
 * @param {object} [options]
 * @param {object} [options.models]   - mongoose models from siteConfig.getModels(), used to read LocaleSetting
 * @param {string} [options.fallback] - last-resort locale code, defaults to "en"
 *
 * @returns {Promise<{ locale: string, dir: "ltr"|"rtl", source: "header"|"cookie"|"settings"|"fallback" }>}
 */
export async function getRequestLocale({ models, fallback = "en" } = {}) {
  // Imported lazily so this module can be bundled into client builds
  // (e.g. via tree-shaking from server.js) without next/headers leaking
  // into the browser. The dynamic import resolves at call time inside
  // a Server Component, where next/headers is always available.
  const { headers, cookies } = await import("next/headers");

  let locale = null;
  let source = null;

  try {
    const headerStore = await headers();
    const fromHeader = headerStore.get(HEADER_NAME);
    if (fromHeader) {
      locale = fromHeader.toLowerCase();
      source = "header";
    }
  } catch {
    /* not in a request scope */
  }

  if (!locale) {
    try {
      const cookieStore = await cookies();
      const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
      if (fromCookie) {
        locale = fromCookie.toLowerCase();
        source = "cookie";
      }
    } catch {
      /* not in a request scope */
    }
  }

  // Look up direction (and validate the locale is enabled) against the
  // LocaleSetting singleton. We DON'T throw if the locale isn't in the
  // enabled list — the resolver chain in pages/layouts handles fallback
  // gracefully — but we do reset the dir to ltr if the lookup fails.
  let dir = "ltr";
  let defaultLocale = fallback;
  if (models?.LocaleSetting) {
    try {
      const settings = await models.LocaleSetting.findOne({ key: "singleton" }).lean();
      if (settings) {
        defaultLocale = settings.defaultLocale || fallback;
        if (!locale) {
          locale = defaultLocale;
          source = "settings";
        }
        const entry = (settings.locales || []).find((l) => l.code === locale);
        if (entry?.dir) dir = entry.dir;
      }
    } catch {
      /* DB offline — fall through to fallback */
    }
  }

  if (!locale) {
    locale = fallback;
    source = "fallback";
  }

  return { locale, dir, source, defaultLocale };
}
