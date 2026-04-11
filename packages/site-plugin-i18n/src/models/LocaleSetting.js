import mongoose from "mongoose";

/**
 * LocaleSetting — singleton document holding the active locale config.
 *
 * Stored in the database (rather than in site.config.js) so editors can
 * add/remove/reorder locales from the admin UI without redeploying.
 *
 * The plugin's static `i18nPlugin({ locales, defaultLocale, localeMeta })`
 * config is treated as a *seed*: on first connect we copy it into this
 * collection, after which the DB record is the source of truth.
 *
 * Shape (single document, _id arbitrary):
 *   {
 *     locales: [
 *       { code: "en", label: "English", nativeLabel: "English", dir: "ltr", enabled: true },
 *       { code: "ar", label: "Arabic",  nativeLabel: "العربية", dir: "rtl", enabled: true },
 *     ],
 *     defaultLocale: "en",
 *   }
 */
const localeEntrySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, lowercase: true },
    label: { type: String, default: "" },
    nativeLabel: { type: String, default: "" },
    dir: { type: String, enum: ["ltr", "rtl"], default: "ltr" },
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const localeSettingSchema = new mongoose.Schema(
  {
    // Always "singleton" — used as a stable lookup key so we never end
    // up with multiple settings docs even under racey first-boot writes.
    key: { type: String, default: "singleton", unique: true, index: true },
    locales: { type: [localeEntrySchema], default: [] },
    defaultLocale: { type: String, default: "en" },
  },
  { timestamps: true },
);

export { localeSettingSchema };
