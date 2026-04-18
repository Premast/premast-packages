import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";

test.describe("login + middleware", () => {
  test("unauthenticated /admin request redirects to /admin/login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/admin\/login/);
    expect(page.url()).toContain("/admin/login");
  });

  test("valid credentials sign the user in and land them on /admin", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("password12345");
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.waitForURL("**/admin", { timeout: 15_000 });
    expect(page.url()).toMatch(/\/admin$/);
  });

  test("invalid credentials keep the user on /admin/login", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("callbackUrl round-trips through login", async ({ page }) => {
    await page.goto("/admin/pages");
    await page.waitForURL(/\/admin\/login\?callbackUrl=%2Fadmin%2Fpages/);

    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Password").fill("password12345");
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.waitForURL(/\/admin\/pages/);
  });
});
