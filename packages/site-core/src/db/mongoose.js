import mongoose from "mongoose";

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
 * Creates a `connectDB` function that connects to MongoDB and runs
 * all registered `afterDbConnect` hooks once.
 */
export function createConnectDB(afterConnectHooks = []) {
  let hooksRan = false;

  return async function connectDB() {
    const conn = await connectMongoose();

    if (!hooksRan) {
      hooksRan = true;
      for (const { pluginName, fn } of afterConnectHooks) {
        try {
          await fn();
        } catch (err) {
          console.error(`[premast] afterDbConnect hook from "${pluginName}" failed:`, err);
        }
      }
    }

    return conn;
  };
}

export { mongoose };
