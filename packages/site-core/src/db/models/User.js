import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["super_admin", "editor"], default: "editor" },
  },
  { timestamps: true },
);

export const User = mongoose.models.User ?? mongoose.model("User", userSchema);
