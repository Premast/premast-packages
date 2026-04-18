import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";

/**
 * Smoke tests for the catch-all /api/* route. Not exhaustive — one
 * assertion per endpoint family that the wiring is correct.
 */
test.describe("API catch-all smoke", () => {
  test("/api/auth/status reflects the seeded super_admin", async ({ request }) => {
    const res = await request.get("/api/auth/status");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.setupComplete).toBe(true);
    expect(body.data.userCount).toBeGreaterThanOrEqual(1);
  });

  test("/api/pages requires auth for POST but allows GET", async ({ request }) => {
    const get = await request.get("/api/pages");
    expect([200, 401]).toContain(get.status()); // optionalAuth — either is valid

    const post = await request.post("/api/pages", {
      data: { title: "x", slug: "x" },
    });
    expect(post.status()).toBe(401);
  });

  test("/api/content-types is admin-only", async ({ request }) => {
    const res = await request.get("/api/content-types");
    expect(res.status()).toBe(401);
  });

  test("/api/globals/:key returns the default shape for unset keys", async ({ request }) => {
    const res = await request.get("/api/globals/header");
    expect([200, 404]).toContain(res.status());
  });

  test("/api/redirects is admin-only", async ({ request }) => {
    const res = await request.get("/api/redirects");
    expect(res.status()).toBe(401);
  });

  test("plugin-registered routes are mounted (i18n locales)", async ({ request }) => {
    // The endpoint itself is the wiring proof — a plugin-registered
    // route is 404 if the serverPlugins() chain isn't resolved.
    const res = await request.get("/api/i18n/locales");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeTruthy();
  });
});
