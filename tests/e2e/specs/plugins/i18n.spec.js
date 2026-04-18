import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";

/**
 * i18n plugin behaviour observed end-to-end.
 *
 * The example site is configured with locales: ["en", "ar"] and
 * defaultLocale: "en" (see examples/full-site/site.config.js). Specs
 * here assert the observable contract of that config — they do NOT
 * cover the full locale-duplication admin flow (that belongs in a
 * richer spec once we can drive the translations UI).
 */

test.describe("i18n plugin", () => {
  test("GET /api/i18n/locales returns the configured locale codes", async ({ request }) => {
    const res = await request.get("/api/i18n/locales");
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Handler returns fields at the top level (not nested under `data`):
    // { locales: ["en", "ar"], localesDetailed: [...], defaultLocale: "en", ... }
    expect(Array.isArray(body.locales), "expected body.locales to be an array").toBe(true);
    expect(body.locales).toEqual(expect.arrayContaining(["en", "ar"]));
    expect(body.defaultLocale).toBe("en");
  });

  test("locale-prefixed URL sets the premast_locale cookie via middleware", async ({ browser, baseURL }) => {
    // Use a dedicated, cookie-empty browser context so the check is
    // definitive. Playwright's APIRequestContext sometimes doesn't
    // surface Set-Cookie for 404 responses the way a real browser
    // does; a BrowserContext always does.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${baseURL}/ar/`, { waitUntil: "domcontentloaded" });
    const cookies = await ctx.cookies();
    await ctx.close();

    const locale = cookies.find((c) => c.name === "premast_locale");
    expect(locale, "middleware should set premast_locale cookie on /ar/").toBeTruthy();
    expect(locale.value).toBe("ar");
  });

  test("i18n-scoped admin page is registered", async ({ adminPage }) => {
    const res = await adminPage.goto("/admin/translations");
    expect(res.status()).toBeLessThan(400);
    expect(adminPage.url()).not.toContain("/admin/login");
  });
});
