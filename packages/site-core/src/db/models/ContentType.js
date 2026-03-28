import mongoose from "mongoose";

const contentTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    urlPrefix: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/, "URL prefix must start with / and contain only lowercase letters, numbers, and hyphens (e.g. /blog)"],
    },
    templateContent: { type: String, default: "" },
    description: { type: String, default: "" },
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const ContentType =
  mongoose.models.ContentType ?? mongoose.model("ContentType", contentTypeSchema);
