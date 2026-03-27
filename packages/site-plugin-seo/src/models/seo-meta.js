import mongoose from "mongoose";

export const seoMetaSchema = new mongoose.Schema(
  {
    pageId: { type: mongoose.Schema.Types.ObjectId, ref: "Page", unique: true },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    ogImage: { type: String, default: "" },
    noIndex: { type: Boolean, default: false },
  },
  { timestamps: true },
);
