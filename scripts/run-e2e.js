#!/usr/bin/env node
/**
 * E2E bootstrap. Owns the full lifecycle so tests start from a known
 * state:
 *
 *   1. Start mongodb-memory-server (in-process).
 *   2. Build examples/full-site with NODE_ENV=production so every
 *      page/route is pre-compiled — dev mode JIT compile makes first
 *      navigations unpredictably slow (30-60s), which causes timeouts
 *      and blank screenshots that look like real bugs.
 *   3. Spawn `next start` wired to the memory-server URI + a
 *      deterministic AUTH_SECRET.
 *   4. Wait for the server to accept HTTP + warm cached routes.
 *   5. Exec `playwright test` with the remaining argv.
 *   6. Tear everything down, propagate the exit code.
 *
 * Set E2E_SKIP_BUILD=1 to reuse an existing .next build during
 * iterative debugging.
 */

import { spawn, spawnSync } from "node:child_process";
import { MongoMemoryServer } from "mongodb-memory-server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const EXAMPLE_DIR = path.join(REPO_ROOT, "examples", "full-site");
const ENV_FILE = path.join(REPO_ROOT, "tests", "e2e", ".env.test");
const PORT = Number(process.env.E2E_PORT || 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Minimal .env loader — just `KEY=VALUE` lines, no quoted strings or
 * interpolation. Anything fancier can live in the file and we'll
 * ignore it cleanly. Returns an object; silently returns {} if the
 * file is missing, which is the expected state when a contributor
 * hasn't provided third-party credentials.
 */
function loadEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return {};
  const text = fs.readFileSync(filepath, "utf8");
  const out = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

let mongo;
let server;

async function waitForHttp(url, { timeoutMs = 120_000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`[run-e2e] ${url} did not respond within ${timeoutMs}ms`);
}

async function shutdown(code = 0) {
  if (server && !server.killed) {
    server.kill("SIGINT");
    await new Promise((r) => setTimeout(r, 500));
    if (!server.killed) server.kill("SIGKILL");
  }
  if (mongo) {
    try {
      await mongo.stop();
    } catch {
      /* ignore */
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

async function main() {
  console.log("[run-e2e] starting mongodb-memory-server…");
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  // Optional third-party creds (DO Spaces, etc.) loaded from a
  // gitignored file so each contributor provides their own and we
  // never commit secrets. Missing file is fine — upload specs skip.
  const fileEnv = loadEnvFile(ENV_FILE);

  // Scope every Spaces upload this run does to a unique prefix so
  // (a) we never overwrite existing production objects, and
  // (b) the cleanup helper in globalTeardown can safely delete
  //     anything under it without touching unrelated files.
  const runId = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
  const spacesPrefix = `e2e-harness/${runId}/`;

  const env = {
    ...process.env,
    ...fileEnv,
    MONGODB_URI: uri,
    MONGODB_DB_NAME: "premast_e2e",
    AUTH_SECRET:
      process.env.AUTH_SECRET || crypto.randomBytes(32).toString("hex"),
    SITE_URL: BASE_URL,
    NEXT_TELEMETRY_DISABLED: "1",
    PORT: String(PORT),
    E2E_PORT: String(PORT),
    E2E_BASE_URL: BASE_URL,
    // Force a run-specific prefix regardless of what's in .env.test.
    // This is the single safety knob protecting the shared bucket.
    ...(fileEnv.DO_SPACES_KEY ? { DO_SPACES_PREFIX: spacesPrefix } : {}),
    // Exposed to specs + teardown so they know where to look.
    E2E_SPACES_PREFIX: spacesPrefix,
  };
  // `next build` requires NODE_ENV=production; the Next server started
  // via `next start` inherits the same env. We intentionally DO NOT
  // flip this to "test" — otherwise every auth response lacks the
  // Secure cookie flag that production sites rely on, and our tests
  // would silently exercise a different code path than real users.
  // Chromium treats 127.0.0.1/localhost as a secure context, so Secure
  // cookies over http work fine in the test browser.
  const prodEnv = { ...env, NODE_ENV: "production" };

  if (!process.env.E2E_SKIP_BUILD) {
    console.log("[run-e2e] building examples/full-site (next build)…");
    const build = spawnSync(
      "pnpm",
      ["--dir", EXAMPLE_DIR, "exec", "next", "build", "--webpack"],
      { env: prodEnv, stdio: "inherit" },
    );
    if (build.status !== 0) {
      console.error(`[run-e2e] build failed with code ${build.status}`);
      await shutdown(build.status ?? 1);
      return;
    }
  } else {
    console.log("[run-e2e] E2E_SKIP_BUILD=1 — reusing existing .next build");
  }

  console.log(`[run-e2e] booting Next.js at ${BASE_URL}… (next start)`);
  // Next.js honors PORT from env (set above), so no argv forwarding needed.
  server = spawn(
    "pnpm",
    ["--dir", EXAMPLE_DIR, "exec", "next", "start"],
    { env, stdio: "inherit" },
  );
  server.on("exit", (code, sig) => {
    if (code !== 0 && code !== null) {
      console.error(`[run-e2e] Next.js exited early (code=${code} signal=${sig})`);
      shutdown(1);
    }
  });

  await waitForHttp(`${BASE_URL}/api/auth/status`);
  console.log("[run-e2e] Next.js is up; warming up routes…");

  // Next dev compiles routes on first hit — a cold /admin/setup can
  // take 30–60s. Warm the pages the suite exercises so specs see
  // ready HTML, not blank screens.
  const warmupPaths = [
    "/admin/setup",
    "/admin/login",
    "/admin",
    "/admin/pages",
    "/",
  ];
  for (const p of warmupPaths) {
    try {
      await fetch(`${BASE_URL}${p}`, { redirect: "manual" });
    } catch {
      /* ignore — some routes 302 and that's fine */
    }
  }
  console.log("[run-e2e] warmup done; running Playwright…");

  const playwright = spawn(
    "pnpm",
    [
      "exec",
      "playwright",
      "test",
      "--config",
      path.join(REPO_ROOT, "tests/e2e/playwright.config.js"),
      ...process.argv.slice(2),
    ],
    { env, stdio: "inherit", cwd: REPO_ROOT },
  );

  playwright.on("exit", (code) => shutdown(code ?? 1));
}

main().catch(async (err) => {
  console.error("[run-e2e]", err);
  await shutdown(1);
});
