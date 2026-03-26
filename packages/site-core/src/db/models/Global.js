import mongoose from "mongoose";

const VALID_KEYS = ["header", "footer"];

const globalSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      enum: VALID_KEYS,
    },
    content: { type: String, default: "" },
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Global = mongoose.models.Global ?? mongoose.model("Global", globalSchema);
export { VALID_KEYS };
