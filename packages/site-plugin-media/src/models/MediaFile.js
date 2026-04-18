import mongoose from "mongoose";

const mediaFileSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    url: { type: String, required: true },
    filename: { type: String, default: "" },
    mime: { type: String, default: "" },
    size: { type: Number, default: 0 },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    alt: { type: String, default: "" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

mediaFileSchema.index({ createdAt: -1 });

export { mediaFileSchema };
