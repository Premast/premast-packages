/**
 * DB-reset fixture. Import `test` from this file when a spec needs a
 * clean DB for each test. The super_admin user is re-seeded after the
 * wipe so the existing auth storage-state remains valid.
 *
 * Also wires a per-test screenshot. Every browser-backed test drops a
 * full-page PNG at tests/e2e/screenshots/<dir>--<spec>--<title>.png.
 * File names are deterministic so reruns OVERWRITE the previous
 * image — the folder never grows and stays a "last run" snapshot.
 * API-only tests (which never request `page`) write nothing.
 */
import { test as base } from "./auth.js";
import { resetDb } from "../lib/mongo.js";
import { seedSuperAdmin } from "../lib/seed.js";
import { snapshot } from "./_internal.js";

export const test = base.extend({
  cleanDb: [
    async ({}, use) => {
      await resetDb();
      await seedSuperAdmin();
      await use();
    },
    { auto: true },
  ],
  // Override the built-in `page` fixture so we can snapshot as
  // teardown. `test.afterEach` declared at fixture-module scope is
  // NOT global — a fixture override is.
  page: async ({ page }, use, testInfo) => {
    await use(page);
    await snapshot(page, testInfo);
  },
});

export { expect } from "./auth.js";
