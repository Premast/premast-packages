import mongoose from "mongoose";
import { ENV, requireEnv } from "./env.js";

/**
 * Connect the test runner to the same Mongo instance the Next.js
 * server is using. The runner may only know the URI through env vars
 * (set by scripts/run-e2e.js), so we don't try to reconnect if a
 * connection is already live — mongoose is process-global.
 */
export async function connect() {
  if (mongoose.connection.readyState === 1) return mongoose;
  const uri = requireEnv(ENV.MONGODB_URI);
  const dbName = process.env[ENV.MONGODB_DB_NAME];
  await mongoose.connect(uri, { ...(dbName ? { dbName } : {}) });
  return mongoose;
}

/**
 * Empty every collection except `system.*`. Used as a per-spec reset
 * so specs start from an empty-but-connected DB.
 *
 * We list collections via the native driver instead of iterating
 * `mongoose.connection.collections` — the runner's mongoose instance
 * only knows about models it has explicitly imported, but the
 * Next.js process owns the full model set. Using listCollections()
 * makes the wipe independent of which models the runner happens to
 * have loaded.
 */
export async function resetDb() {
  await connect();
  const db = mongoose.connection.db;
  const cols = await db.listCollections({}, { nameOnly: true }).toArray();
  await Promise.all(
    cols
      .filter((c) => !c.name.startsWith("system."))
      .map(async (c) => {
        try {
          await db.collection(c.name).deleteMany({});
        } catch (err) {
          if (err?.codeName !== "NamespaceNotFound") throw err;
        }
      }),
  );
}

export async function disconnect() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
