import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
import { createContentItem, createContentType } from "../../fixtures/factories.js";

/**
 * Note: site-core seeds a "Blog Article" content type at urlPrefix=/blog
 * with a "hello-world" item on every fresh DB. Specs must use urlPrefixes
 * OTHER than /blog to avoid colliding with that seed.
 */
test.describe("content types & items — routing", () => {
  test("an item under a type's urlPrefix is served at /<prefix>/<slug>", async ({ adminRequest, page }) => {
    const ct = await createContentType(adminRequest, {
      name: "Guides",
      slug: "guides",
      urlPrefix: "/guides",
    });
    await createContentItem(adminRequest, ct._id, {
      title: "Getting Started",
      slug: "getting-started",
      published: true,
    });

    const res = await page.goto("/guides/getting-started");
    expect(res.status()).toBe(200);
    await expect(page.locator("article")).toHaveCount(1);
  });

  test("unpublished item 404s", async ({ adminRequest, page }) => {
    const ct = await createContentType(adminRequest, {
      name: "Draft Zone",
      slug: "draft-zone",
      urlPrefix: "/draft-zone",
    });
    await createContentItem(adminRequest, ct._id, {
      title: "Hidden",
      slug: "hidden",
      published: false,
    });
    const res = await page.goto("/draft-zone/hidden");
    expect(res.status()).toBe(404);
  });

  test("multiple content types coexist and route independently", async ({ adminRequest, page }) => {
    const a = await createContentType(adminRequest, {
      name: "Guides",
      slug: "guides",
      urlPrefix: "/guides",
    });
    const b = await createContentType(adminRequest, {
      name: "News",
      slug: "news",
      urlPrefix: "/news",
    });
    await createContentItem(adminRequest, a._id, {
      title: "Guide Entry",
      slug: "entry-a",
      published: true,
    });
    await createContentItem(adminRequest, b._id, {
      title: "News Entry",
      slug: "entry-b",
      published: true,
    });

    const r1 = await page.goto("/guides/entry-a");
    expect(r1.status()).toBe(200);
    const r2 = await page.goto("/news/entry-b");
    expect(r2.status()).toBe(200);
    const r3 = await page.goto("/guides/entry-b");
    expect(r3.status()).toBe(404);
  });
});
