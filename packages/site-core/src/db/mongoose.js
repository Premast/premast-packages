import mongoose from "mongoose";

const globalForMongoose = globalThis;

function parseTimeoutMs(value, fallback) {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function augmentConnectionError(err) {
  if (err?.name !== "MongooseServerSelectionError") return err;
  const next = new Error(
    [
      err.message,
      "MongoDB is unreachable from this process. Verify the host/port in MONGODB_URI,",
      "that mongod listens on the right interface (not only 127.0.0.1), firewall rules,",
      "and Atlas / cloud IP allowlists if applicable.",
    ].join(" "),
  );
  next.cause = err;
  next.name = err.name;
  return next;
}

const cache = globalForMongoose.__premast_mongoose ?? {
  conn: null,
  promise: null,
  afterConnect: null,
};
if (!globalForMongoose.__premast_mongoose) {
  globalForMongoose.__premast_mongoose = cache;
}

/**
 * Low-level connect — used internally. Most consumers should use the
 * `connectDB()` returned by `createSiteConfig()`.
 */
export async function connectMongoose() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI. Add it to .env.local with your MongoDB connection string.",
    );
  }
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const dbName = process.env.MONGODB_DB_NAME?.trim();
    const serverSelectionTimeoutMS = parseTimeoutMs(
      process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
      30000,
    );
    const connectTimeoutMS = parseTimeoutMs(
      process.env.MONGODB_CONNECT_TIMEOUT_MS,
      10000,
    );
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS,
      connectTimeoutMS,
      ...(dbName ? { dbName } : {}),
    };
    cache.promise = mongoose.connect(uri, opts);
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw augmentConnectionError(err);
  }
  return cache.conn;
}

/**
 * Creates a `connectDB` function that connects to MongoDB and runs
 * all registered `afterDbConnect` hooks once.
 */
export function createConnectDB(afterConnectHooks = []) {
  return async function connectDB() {
    const conn = await connectMongoose();

    if (!cache.afterConnect) {
      cache.afterConnect = (async () => {
        for (const { pluginName, fn } of afterConnectHooks) {
          try {
            await fn();
          } catch (err) {
            console.error(`[premast] afterDbConnect hook from "${pluginName}" failed:`, err);
          }
        }
      })();
    }
    await cache.afterConnect;
    return conn;
  };
}

export { mongoose };
