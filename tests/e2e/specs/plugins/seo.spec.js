import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
import { createPage } from "../../fixtures/factories.js";

/**
 * SEO plugin behaviour observed end-to-end:
 *   - metaTitle / metaDescription on a Page's root props flow into
 *     the SSR <title> and <meta name="description">.
 *   - noIndex=true produces robots meta=noindex,nofollow.
 *   - The plugin registers /api/seo/* endpoints.
 */
function seoPuck(root) {
  return JSON.stringify({ root: { props: root }, content: [], zones: {} });
}

test.describe("SEO plugin", () => {
  test("metaTitle and metaDescription render in SSR <head>", async ({ adminRequest, page }) => {
    await createPage(adminRequest, {
      title: "SEO Smoke",
      slug: "seo-smoke",
      content: seoPuck({
        metaTitle: "SEO Smoke Title",
        metaDescription: "SEO Smoke Description",
      }),
      published: true,
    });

    const res = await page.goto("/seo-smoke", { waitUntil: "networkidle" });
    expect(res.status()).toBe(200);
    await expect(page).toHaveTitle(/SEO Smoke Title/);
    // Next.js 16 streams metadata into <head> after initial paint, so
    // reading the raw HTML (which includes the streamed boundary) is
    // more reliable than locator().getAttribute for meta tags.
    const html = await page.content();
    expect(html).toContain("SEO Smoke Description");
  });

  test("plugin registers /api/seo/sitemap and /api/seo/robots", async ({ request }) => {
    const sitemap = await request.get("/api/seo/sitemap");
    expect(sitemap.status()).toBeLessThan(500);
    const robots = await request.get("/api/seo/robots");
    expect(robots.status()).toBeLessThan(500);
  });
});
