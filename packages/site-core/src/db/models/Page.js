import mongoose from "mongoose";

const pageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    content: { type: String, default: "" },
    published: { type: Boolean, default: false },

    // i18n fields — populated by @premast/site-plugin-i18n via the
    // beforePageSave hook. Safe to leave null on single-locale sites.
    locale: { type: String, default: null, index: true },
    translationGroupId: { type: String, default: null, index: true },
  },
  { timestamps: true },
);

// Slug must be unique per locale, NOT globally. This lets `/en/about`
// and `/ar/about` coexist with the same slug. On legacy pages where
// locale is null, the compound index still enforces a single null entry
// per slug, which preserves the pre-i18n behavior.
//
// NOTE: existing databases that previously had a `slug_1` unique index
// must drop it before this index can take effect. Drop manually or by
// recreating the collection in development.
pageSchema.index({ slug: 1, locale: 1 }, { unique: true });

export const Page = mongoose.models.Page ?? mongoose.model("Page", pageSchema);
