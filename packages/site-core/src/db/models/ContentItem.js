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
  },
  { timestamps: true },
);

contentItemSchema.index({ contentType: 1, slug: 1 }, { unique: true });

export const ContentItem =
  mongoose.models.ContentItem ?? mongoose.model("ContentItem", contentItemSchema);
