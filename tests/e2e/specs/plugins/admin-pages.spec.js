import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";

/**
 * Every admin page — core + plugin — must render for an authenticated
 * super_admin without client-side errors. This catches broken imports,
 * missing exports, and context misuse at the cheapest possible cost.
 *
 * Pages are fetched through `adminPage` so the __premast_session cookie
 * is attached. We don't assert a specific heading per page — that
 * would couple the test to admin copy. Instead we assert:
 *   - the request didn't redirect to /admin/login (auth worked)
 *   - the response status is < 400
 *   - no uncaught page errors fired during render
 */
const ROUTES = [
  // Core
  { path: "/admin", label: "dashboard" },
  { path: "/admin/pages", label: "pages list" },
  { path: "/admin/global", label: "global header/footer" },
  { path: "/admin/templates", label: "templates" },
  { path: "/admin/content", label: "content items" },
  { path: "/admin/redirects", label: "redirects" },
  { path: "/admin/settings", label: "site settings" },
  { path: "/admin/users", label: "users" },
  // Plugin-contributed
  { path: "/admin/seo", label: "SEO plugin" },
  { path: "/admin/translations", label: "i18n plugin" },
  { path: "/admin/media", label: "media plugin" },
  { path: "/admin/mcp", label: "MCP plugin" },
];

test.describe("admin pages — smoke", () => {
  for (const { path, label } of ROUTES) {
    test(`${path} (${label}) loads without errors`, async ({ adminPage }) => {
      const errors = [];
      adminPage.on("pageerror", (err) => errors.push(err.message));

      const res = await adminPage.goto(path, { waitUntil: "domcontentloaded" });
      expect(res.status(), `${path} returned ${res.status()}`).toBeLessThan(400);
      expect(adminPage.url(), `${path} redirected to login — auth broken`).not.toContain("/admin/login");

      // Let any hydration-time errors surface.
      await adminPage.waitForLoadState("load");
      expect(errors, `uncaught errors on ${path}: ${errors.join(" | ")}`).toHaveLength(0);
    });
  }
});
