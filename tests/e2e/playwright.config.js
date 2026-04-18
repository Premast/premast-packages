import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./specs",
  testMatch: "**/*.spec.js",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "../../playwright-report" }]],
  outputDir: "../../test-results",
  globalSetup: "./global-setup.js",
  globalTeardown: "./global-teardown.js",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // The dev server is started by scripts/run-e2e.js BEFORE Playwright
  // boots, because we need to start mongodb-memory-server first and
  // inject MONGODB_URI / AUTH_SECRET into the Next.js process env.
  // That ordering is not reliably achievable via the `webServer`
  // option, so we own the lifecycle ourselves.
});
