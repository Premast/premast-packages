/**
 * Shared helpers used by multiple fixtures. Not a public API — prefix
 * with `_` so agents know not to import this from specs.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STORAGE_DIR = path.resolve(__dirname, "..", ".auth");
export const SCREENSHOT_DIR = path.resolve(__dirname, "..", "screenshots");

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 80);
}

export function screenshotPathFor(testInfo) {
  const specFile = path.basename(testInfo.file, ".spec.js");
  const dir = path.basename(path.dirname(testInfo.file));
  const name = `${slugify(dir)}--${slugify(specFile)}--${slugify(testInfo.title)}.png`;
  return path.join(SCREENSHOT_DIR, name);
}

/**
 * Snap a full-page screenshot for a test. Safe to call on a page that
 * hasn't navigated anywhere — it becomes a no-op. Never throws.
 */
export async function snapshot(page, testInfo) {
  try {
    if (!page || page.isClosed?.()) return;
    const url = page.url();
    if (!url || url === "about:blank") return;
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: screenshotPathFor(testInfo),
      fullPage: true,
    });
  } catch {
    /* never block the test on a screenshot failure */
  }
}

/**
 * Login via /api/auth/login and cache the resulting __premast_session
 * cookie as a Playwright storage-state JSON. Reused across specs so
 * bcrypt runs once per role per run.
 */
export async function ensureStorageState(name, email, password, baseURL) {
  const file = path.join(STORAGE_DIR, `${name}.json`);
  try {
    await fs.access(file);
    return file;
  } catch {
    /* missing — create below */
  }

  await fs.mkdir(STORAGE_DIR, { recursive: true });

  const res = await fetch(`${baseURL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[auth fixture] login failed for ${email}: ${res.status} ${text}`);
  }

  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/__premast_session=([^;]+)/);
  if (!match) {
    throw new Error("[auth fixture] login did not return a __premast_session cookie");
  }

  const { hostname } = new URL(baseURL);
  const state = {
    cookies: [
      {
        name: "__premast_session",
        value: match[1],
        domain: hostname,
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
        expires: -1,
      },
    ],
    origins: [],
  };
  await fs.writeFile(file, JSON.stringify(state, null, 2));
  return file;
}
