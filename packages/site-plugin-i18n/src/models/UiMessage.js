import mongoose from "mongoose";

/**
 * UiMessage — optional model for UI string translations managed through
 * the admin (as opposed to code-shipped `messages/{locale}.json` files).
 *
 * Shape:
 *   { key: "cart.add", locale: "en", value: "Add to cart" }
 *
 * Compound unique index on (key, locale) so each string exists at most
 * once per locale.
 */
const uiMessageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    locale: { type: String, required: true, trim: true, lowercase: true },
    value: { type: String, required: true, default: "" },
    namespace: { type: String, default: "default" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

uiMessageSchema.index({ key: 1, locale: 1 }, { unique: true });
uiMessageSchema.index({ namespace: 1, locale: 1 });

export { uiMessageSchema };
