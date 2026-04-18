import { hashPassword } from "@premast/site-core/auth";
import { connect } from "./mongo.js";

/**
 * Seed a super admin user. Uses the same password-hashing code as the
 * real /api/auth/setup handler, so login against the live site works
 * with the returned credentials.
 */
export async function seedSuperAdmin({
  email = "admin@example.com",
  password = "password12345",
  name = "Admin",
} = {}) {
  await connect();
  const { User } = await import("@premast/site-core/db");
  const passwordHash = await hashPassword(password);
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { email, passwordHash, name, role: "super_admin" },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { user, email, password };
}

export async function seedEditor({
  email = "editor@example.com",
  password = "password12345",
  name = "Editor",
} = {}) {
  await connect();
  const { User } = await import("@premast/site-core/db");
  const passwordHash = await hashPassword(password);
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { email, passwordHash, name, role: "editor" },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { user, email, password };
}
