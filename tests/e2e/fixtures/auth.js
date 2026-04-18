import { test as base, expect } from "@playwright/test";
import { ensureStorageState, snapshot } from "./_internal.js";

export const test = base.extend({
  /**
   * Playwright page pre-authenticated as super_admin. Credentials are
   * seeded by global-setup.js. Snapshotting runs in teardown before
   * the context closes, so failure screenshots are preserved.
   */
  adminPage: async ({ browser, baseURL }, use, testInfo) => {
    const file = await ensureStorageState(
      "super_admin",
      "admin@example.com",
      "password12345",
      baseURL,
    );
    const ctx = await browser.newContext({ storageState: file });
    const page = await ctx.newPage();
    await use(page);
    await snapshot(page, testInfo);
    await ctx.close();
  },
  /**
   * Authenticated request context — use for API assertions without
   * booting a browser. Faster than `adminPage.request` for pure
   * request/response checks.
   */
  adminRequest: async ({ playwright, baseURL }, use) => {
    const file = await ensureStorageState(
      "super_admin",
      "admin@example.com",
      "password12345",
      baseURL,
    );
    const ctx = await playwright.request.newContext({
      baseURL,
      storageState: file,
    });
    await use(ctx);
    await ctx.dispose();
  },
});

export { expect };
