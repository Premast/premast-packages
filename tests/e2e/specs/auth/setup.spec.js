import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
import { resetDb } from "../../lib/mongo.js";

test.describe("first-time setup flow", () => {
  test.beforeEach(async () => {
    // setup.spec exercises the flow from an empty DB — override the
    // auto-seeded super admin.
    await resetDb();
  });

  test("creates the first super admin and redirects to /admin", async ({ page }) => {
    await page.goto("/admin/setup");
    await page.getByLabel("Full Name").fill("Admin");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("password12345");
    await page.getByRole("button", { name: "Create Account" }).click();

    await page.waitForURL("**/admin", { timeout: 15_000 });
    expect(page.url()).toMatch(/\/admin$/);
  });

  test("blocks a second setup once a user exists", async ({ page, request }) => {
    // Seed one user via the API.
    const first = await request.post("/api/auth/setup", {
      data: { name: "First", email: "first@example.com", password: "password12345" },
    });
    expect(first.status()).toBe(201);

    // Second attempt should 403 at the API and show the already-setup
    // Result component at /admin/setup.
    const second = await request.post("/api/auth/setup", {
      data: { name: "Second", email: "second@example.com", password: "password12345" },
    });
    expect(second.status()).toBe(403);

    await page.goto("/admin/setup");
    await expect(page.getByText(/setup already complete/i)).toBeVisible();
  });
});
