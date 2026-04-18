import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
import { createPage } from "../../fixtures/factories.js";

test.describe("pages — API + SSR", () => {
  test("create → publish → SSR renders the page at /<slug>", async ({ adminRequest, page }) => {
    const puck = {
      root: { props: { metaTitle: "About Us" } },
      content: [],
      zones: {},
    };
    const created = await createPage(adminRequest, {
      title: "About Us",
      slug: "about-us",
      content: JSON.stringify(puck),
      published: true,
    });
    expect(created.slug).toBe("about-us");

    const res = await page.goto("/about-us");
    expect(res.status()).toBe(200);
    await expect(page).toHaveTitle(/About Us/);
  });

  test("unpublished page is not visible on the public site (404)", async ({ adminRequest, page }) => {
    await createPage(adminRequest, {
      title: "Draft",
      slug: "draft",
      published: false,
    });
    const res = await page.goto("/draft");
    expect(res.status()).toBe(404);
  });

  test("PATCH updates title and SSR reflects the change", async ({ adminRequest, page }) => {
    const created = await createPage(adminRequest, {
      title: "Original",
      slug: "original",
      content: JSON.stringify({
        root: { props: { metaTitle: "Original" } },
        content: [],
        zones: {},
      }),
      published: true,
    });

    const updated = await adminRequest.patch(`/api/pages/${created._id}`, {
      data: {
        content: JSON.stringify({
          root: { props: { metaTitle: "Updated Title" } },
          content: [],
          zones: {},
        }),
      },
    });
    expect(updated.ok()).toBeTruthy();

    await page.goto("/original");
    await expect(page).toHaveTitle(/Updated Title/);
  });

  test("renaming the slug auto-creates a 301 redirect record from old → new", async ({ adminRequest }) => {
    const created = await createPage(adminRequest, {
      title: "Old Name",
      slug: "old-name",
      published: true,
    });

    const res = await adminRequest.patch(`/api/pages/${created._id}`, {
      data: { slug: "new-name" },
    });
    expect(res.ok()).toBeTruthy();

    // The auto-redirect hook fires on update. Verify via the
    // /api/redirects list rather than following the redirect in the
    // browser — that path goes through the [...path] catch-all, which
    // passes locale=null to resolveRedirect while the hook stores the
    // redirect under locale="en" (populated by the i18n plugin).
    // That mismatch is a separate site-core concern; the hook
    // behaviour itself is what this spec proves.
    const list = await adminRequest.get("/api/redirects");
    expect(list.ok()).toBeTruthy();
    const { data } = await list.json();
    const match = data.find((r) => r.fromPath === "/old-name" && r.toPath === "/new-name");
    expect(match, "expected auto-slug-change redirect to exist").toBeTruthy();
    expect(match.statusCode).toBe(301);
    expect(match.source).toBe("auto-slug-change");
  });
});
