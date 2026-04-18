import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { seedSuperAdmin } from "./lib/seed.js";
import { disconnect, resetDb } from "./lib/mongo.js";
import { ENV, requireEnv } from "./lib/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Playwright globalSetup. By the time this runs:
 *   - scripts/run-e2e.js has started mongodb-memory-server and the
 *     Next.js dev server, and populated MONGODB_URI + AUTH_SECRET in
 *     process.env.
 *   - The dev server has compiled /api/auth/status.
 *
 * We:
 *   1. Wipe any leftover state and seed the super_admin user that
 *      fixtures/auth.js authenticates as.
 *   2. Launch a throwaway browser and visit every admin route the
 *      suite exercises. In dev mode, Next compiles the client JS
 *      bundle on first hit — that takes 10–30s per route — and the
 *      initial SSR HTML is blank until hydration. Warming once here
 *      turns every subsequent test navigation into a fast cached hit.
 */
export default async function globalSetup() {
  await resetDb();
  await seedSuperAdmin();
  await disconnect();

  // Wipe the screenshots directory so each run's folder is
  // authoritative — stale PNGs from deleted/renamed tests don't
  // linger. Per-test files are written during teardown, so no race.
  const shots = path.join(__dirname, "screenshots");
  await fs.rm(shots, { recursive: true, force: true });

  const baseUrl = process.env[ENV.BASE_URL] || `http://127.0.0.1:${requireEnv(ENV.PORT)}`;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const routes = ["/admin/setup", "/admin/login", "/"];
  for (const path of routes) {
    try {
      await page.goto(`${baseUrl}${path}`, {
        waitUntil: "networkidle",
        timeout: 120_000,
      });
    } catch (err) {
      console.warn(`[globalSetup] warmup for ${path} failed: ${err.message}`);
    }
  }

  await browser.close();
}
