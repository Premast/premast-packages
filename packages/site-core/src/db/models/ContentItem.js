import mongoose from "mongoose";

const contentItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    contentType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContentType",
      required: true,
    },
    content: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    published: { type: Boolean, default: false },

    // i18n fields — populated by @premast/site-plugin-i18n via the
    // beforeContentItemSave hook. Safe to leave null on single-locale sites.
    locale: { type: String, default: null, index: true },
    translationGroupId: { type: String, default: null, index: true },
  },
  { timestamps: true },
);

// Slug must be unique per (contentType, locale) — NOT globally per type.
// This lets a "blog/about" article exist in both /en and /ar simultaneously.
// On single-locale sites where locale is null the index still enforces a
// single null entry per (contentType, slug), preserving pre-i18n behavior.
contentItemSchema.index({ contentType: 1, slug: 1, locale: 1 }, { unique: true });

export const ContentItem =
  mongoose.models.ContentItem ?? mongoose.model("ContentItem", contentItemSchema);
