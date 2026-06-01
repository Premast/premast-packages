/**
 * Seed (or reset) a super_admin in the database that examples/full-site
 * connects to. Reads MONGODB_URI / MONGODB_DB_NAME from .env.local:
 *
 *   node --env-file=.env.local scripts/seed-admin.mjs
 *
 * Configure via env:
 *   ADMIN_EMAIL    (default: admin@example.com)
 *   ADMIN_NAME     (default: Admin)
 *   ADMIN_PASSWORD (default: random 24-byte hex; printed at end)
 *
 * Imports site-core via relative path because this script only runs
 * inside the workspace — it's not shipped to consumers of the example.
 */
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { hashPassword } from "../../../packages/site-core/src/auth/password.js";
import { User } from "@premast/site-core/db";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;
if (!uri) {
  console.error("MONGODB_URI is not set (use --env-file=.env.local)");
  process.exit(1);
}

const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase().trim();
const name = process.env.ADMIN_NAME ?? "Admin";
const providedPassword = process.env.ADMIN_PASSWORD;
const password = providedPassword ?? randomBytes(24).toString("hex");

await mongoose.connect(uri, dbName ? { dbName } : {});
const user = await User.findOneAndUpdate(
  { email },
  { email, passwordHash: await hashPassword(password), name, role: "super_admin" },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);
console.log(JSON.stringify({ id: user._id.toString(), email: user.email, role: user.role }, null, 2));
if (!providedPassword) {
  console.log(`\nGenerated password (save this — it won't be shown again):\n  ${password}`);
}
await mongoose.disconnect();
