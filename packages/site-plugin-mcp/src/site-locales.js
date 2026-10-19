import mongoose from "mongoose";

/**
 * A multi-language site (@premast/site-plugin-i18n) stores one header
 * and one footer per locale, and keeps its locale list in the i18n
 * LocaleSetting singleton — the list the admin's locale settings edit.
 * A single-language site has no such list and stores its globals under
 * locale null.
 *
 * The singleton is read from its collection, not through the
 * LocaleSetting model: the stdio server doesn't load the i18n plugin,
 * so the model isn't registered there.
 */
async function getSiteLocales() {
  const settings = await mongoose.connection
    .collection("localesettings")
    .findOne({ key: "singleton" });
  if (!settings?.locales?.length) return null;
  return {
    codes: settings.locales.map((l) => l.code),
    defaultLocale: settings.defaultLocale,
  };
}

/**
 * Resolve the locale a tool call targets: the requested locale if the
 * site has it, the site's default locale when none is requested, and
 * null on a single-language site. Anything else is refused, so a write
 * can never create a record for a language the site doesn't have.
 *
 * Returns `{ locale }` or `{ error }`.
 */
export async function resolveLocale(requested) {
  const wanted = requested?.trim().toLowerCase() || null;
  const site = await getSiteLocales();
  if (!site) {
    return wanted
      ? { error: `this site has a single language, so it has no locale "${wanted}". Omit locale.` }
      : { locale: null };
  }
  const locale = wanted ?? site.defaultLocale;
  if (!site.codes.includes(locale)) {
    return { error: `this site has no locale "${locale}". Its locales are: ${site.codes.join(", ")}` };
  }
  return { locale };
}
