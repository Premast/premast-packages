import mongoose from "mongoose";

const pageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    content: { type: String, default: "" },
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Page = mongoose.models.Page ?? mongoose.model("Page", pageSchema);
