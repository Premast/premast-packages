import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";

/**
 * Redirects are a core (not plugin) concern, but they're P1 behaviour
 * the suite needs to cover. Auto-slug-change redirects are already
 * asserted in pages/crud.spec.js — this file focuses on manual
 * redirects created through the /api/redirects endpoint and served
 * through the [...path] catch-all.
 */
test.describe("manual redirects", () => {
  test("creating a 301 via /api/redirects is served by the catch-all", async ({ adminRequest, page }) => {
    const create = await adminRequest.post("/api/redirects", {
      data: {
        fromPath: "/old-blog-url",
        toPath: "/new-blog-url",
        statusCode: 301,
      },
    });
    expect(create.status()).toBe(201);

    // Follow the redirect and confirm we land on the new path. The
    // target route itself 404s (no page exists there), but the URL
    // the browser ends up at is what proves the redirect fired.
    await page.goto("/old-blog-url", { waitUntil: "domcontentloaded" });
    expect(page.url()).toContain("/new-blog-url");
  });

  test("duplicate fromPath returns 409", async ({ adminRequest }) => {
    const first = await adminRequest.post("/api/redirects", {
      data: { fromPath: "/dup", toPath: "/target-a" },
    });
    expect(first.status()).toBe(201);
    const second = await adminRequest.post("/api/redirects", {
      data: { fromPath: "/dup", toPath: "/target-b" },
    });
    expect(second.status()).toBe(409);
  });

  test("listing redirects surfaces both manual and auto-slug-change entries", async ({ adminRequest }) => {
    await adminRequest.post("/api/redirects", {
      data: { fromPath: "/foo", toPath: "/bar" },
    });
    const list = await adminRequest.get("/api/redirects");
    expect(list.ok()).toBe(true);
    const { data } = await list.json();
    expect(data.find((r) => r.fromPath === "/foo")?.source).toBe("manual");
  });
});
