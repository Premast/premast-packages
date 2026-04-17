import mongoose from "mongoose";

const redirectSchema = new mongoose.Schema(
  {
    fromPath: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^\/.*/,
    },
    toPath: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^\/.*/,
    },
    // Locale is optional. When set, redirects only fire for the given
    // locale; null applies to legacy / single-locale sites.
    locale: { type: String, default: null, index: true },
    statusCode: { type: Number, enum: [301, 302], default: 301 },
    // "auto-slug-change" = created by the afterPageSave / afterContentItemSave
    // hook when an editor renames a slug. "manual" = added through
    // the admin Redirects UI.
    source: {
      type: String,
      enum: ["auto-slug-change", "manual"],
      default: "manual",
    },
    hits: { type: Number, default: 0 },
    lastHitAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// A given fromPath can only have one redirect per locale. The unique
// compound index also keeps null-locale entries distinct from
// per-locale ones.
redirectSchema.index({ fromPath: 1, locale: 1 }, { unique: true });

// Used by the chain-prevention step in the auto-redirect hook to find
// any existing redirects that point AT the slug being changed, so we
// can rewrite them to point at the new slug.
redirectSchema.index({ toPath: 1 });

export const Redirect =
  mongoose.models.Redirect ?? mongoose.model("Redirect", redirectSchema);
