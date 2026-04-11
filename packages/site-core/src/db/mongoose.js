import mongoose from "mongoose";
import { runCoreMigrations } from "./migrations.js";

/**
 * Connect to MongoDB. Calls mongoose.connect() every time —
 * Mongoose internally no-ops if already connected on this instance.
 * This is necessary because Next.js webpack creates separate bundles
 * with separate mongoose imports, so globalThis caching doesn't work.
 */
export async function connectMongoose() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI. Add it to .env.local with your MongoDB connection string.",
    );
  }

  await mongoose.connect(uri, {
    bufferCommands: true,
    ...(process.env.MONGODB_DB_NAME ? { dbName: process.env.MONGODB_DB_NAME.trim() } : {}),
  });

  return mongoose;
}

/**
 * Creates a `connectDB` function that connects to MongoDB, runs
 * site-core migrations once, then runs `afterDbConnect` hooks once.
 *
 * Migrations always run before plugin hooks so plugins observe a
 * fully migrated database.
 *
 * Each `afterDbConnect` hook is called with `({ mongoose, models })`.
 * Plugins should use `models[Name]` rather than re-importing
 * mongoose, so they always see the consuming site's models (not
 * stale models registered in the plugin's own mongoose copy).
 */
export function createConnectDB(afterConnectHooks = []) {
  let setupRan = false;

  return async function connectDB() {
    const conn = await connectMongoose();

    if (!setupRan) {
      setupRan = true;
      try {
        await runCoreMigrations();
      } catch (err) {
        // Migration failures shouldn't crash the whole app — they'll
        // retry on the next boot. Log loudly so the operator notices.
        console.error("[premast] core migrations failed (will retry on next boot):", err);
      }
      const ctx = { mongoose, models: mongoose.connection.models };
      for (const { pluginName, fn } of afterConnectHooks) {
        try {
          await fn(ctx);
        } catch (err) {
          console.error(`[premast] afterDbConnect hook from "${pluginName}" failed:`, err);
        }
      }
    }

    return conn;
  };
}

export { mongoose };
