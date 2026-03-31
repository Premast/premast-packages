import mongoose from "mongoose";

const siteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

export const SiteSettings =
  mongoose.models.SiteSettings ?? mongoose.model("SiteSettings", siteSettingsSchema);
