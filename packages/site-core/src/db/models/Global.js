import mongoose from "mongoose";

const VALID_KEYS = ["header", "footer"];

const globalSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: VALID_KEYS,
    },
    content: { type: String, default: "" },
    published: { type: Boolean, default: false },

    // i18n fields — populated by @premast/site-plugin-i18n via the
    // beforeGlobalSave hook. Safe to leave null on single-locale sites.
    locale: { type: String, default: null, index: true },
    translationGroupId: { type: String, default: null, index: true },
  },
  { timestamps: true },
);

// Each (key, locale) pair must be unique. The legacy `key_1` unique
// index is dropped automatically by site-core's migration runner on
// first connect — see src/db/migrations.js.
globalSchema.index({ key: 1, locale: 1 }, { unique: true });

export const Global = mongoose.models.Global ?? mongoose.model("Global", globalSchema);
export { VALID_KEYS };
