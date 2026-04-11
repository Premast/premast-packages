import mongoose from "mongoose";

/**
 * Migration runner for site-core.
 *
 * Migrations run once on first DB connect, are idempotent (safe to
 * run twice), and track applied IDs in a `_premast_migrations`
 * collection so they only execute once per database.
 *
 * Plugins can ship their own migrations via the `afterDbConnect`
 * hook. Site-core ships only the migrations needed to keep the
 * built-in models working across upgrades.
 *
 * Adding a new migration:
 *   1. Append to the `migrations` array below.
 *   2. Use a stable, unique `id` (e.g. "005-rename-foo-field").
 *   3. The `up` function MUST be idempotent — handle the case where
 *      the change has already been applied (no legacy state to fix).
 *   4. NEVER edit or remove an existing migration. If you need to
 *      revert, ship a new migration that undoes it.
 */

const COLLECTION = "_premast_migrations";

/**
 * Built-in site-core migrations.
 *
 * Order matters — migrations run sequentially in the order listed.
 */
const migrations = [
  {
    id: "001-drop-legacy-page-slug-index",
    description:
      "Drop the legacy `slug_1` unique index on pages so the new compound (slug, locale) index can replace it.",
    async up(db) {
      const indexes = await db.collection("pages").indexes();
      const legacy = indexes.find((i) => i.name === "slug_1");
      if (legacy) {
        await db.collection("pages").dropIndex("slug_1");
        return { dropped: "slug_1" };
      }
      return { dropped: null };
    },
  },
  {
    id: "002-drop-legacy-global-key-index",
    description:
      "Drop the legacy `key_1` unique index on globals so the new compound (key, locale) index can replace it.",
    async up(db) {
      const indexes = await db.collection("globals").indexes();
      const legacy = indexes.find((i) => i.name === "key_1");
      if (legacy) {
        await db.collection("globals").dropIndex("key_1");
        return { dropped: "key_1" };
      }
      return { dropped: null };
    },
  },
  {
    id: "003-drop-legacy-contentitem-slug-index",
    description:
      "Drop the legacy `contentType_1_slug_1` unique index on contentitems so the new compound (contentType, slug, locale) index can replace it. Required for @premast/site-plugin-i18n to create per-locale siblings of an existing content item.",
    async up(db) {
      // The collection may not exist yet on a brand-new site that
      // hasn't created any content items — Mongo throws on indexes()
      // against a missing namespace, so guard for that.
      const collections = await db
        .listCollections({ name: "contentitems" })
        .toArray();
      if (collections.length === 0) {
        return { dropped: null, reason: "collection does not exist yet" };
      }
      const indexes = await db.collection("contentitems").indexes();
      const legacy = indexes.find((i) => i.name === "contentType_1_slug_1");
      if (legacy) {
        await db.collection("contentitems").dropIndex("contentType_1_slug_1");
        return { dropped: "contentType_1_slug_1" };
      }
      return { dropped: null };
    },
  },
];

/**
 * Run all pending site-core migrations.
 *
 * Called automatically by `createConnectDB`. Safe to call multiple
 * times — only unapplied migrations execute.
 */
export async function runCoreMigrations() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("[premast] runCoreMigrations: no active mongoose connection");
  }

  const applied = await db
    .collection(COLLECTION)
    .find({}, { projection: { id: 1 } })
    .toArray();
  const appliedIds = new Set(applied.map((m) => m.id));

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) continue;
    try {
      const result = await migration.up(db);
      await db.collection(COLLECTION).insertOne({
        id: migration.id,
        description: migration.description,
        appliedAt: new Date(),
        result,
      });
      console.log(`[premast] migration "${migration.id}" applied`, result);
    } catch (err) {
      console.error(`[premast] migration "${migration.id}" failed:`, err);
      // Don't insert into _premast_migrations on failure — it'll be
      // retried on the next boot.
      throw err;
    }
  }
}
