import mongoose from "mongoose";

/**
 * A Symbol is a reusable Puck section — a named, saved Puck-data blob
 * that pages reference by id instead of copying. Editing the symbol
 * updates every page that references it (edit-once, render-everywhere).
 *
 * This generalises the core `Global` model (which is enum-locked to
 * header/footer) into a free-form, slug-addressed collection.
 */
const symbolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    // Stringified Puck data: { root, content: [...] }
    content: { type: String, default: "" },
    published: { type: Boolean, default: false },

    // i18n fields — populated by @premast/site-plugin-i18n via save
    // hooks. Safe to leave null on single-locale sites.
    locale: { type: String, default: null, index: true },
    translationGroupId: { type: String, default: null, index: true },
  },
  { timestamps: true },
);

// Each (slug, locale) pair must be unique.
symbolSchema.index({ slug: 1, locale: 1 }, { unique: true });

export { symbolSchema };

// HMR-safe model accessor for use outside the API context (e.g. the
// render-expansion hook, which doesn't receive `models`).
export function getSymbolModel() {
  return mongoose.models.Symbol ?? mongoose.model("Symbol", symbolSchema);
}
