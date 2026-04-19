# tests/e2e — Agent Rules

> **Read this before writing, editing, or debugging E2E tests.**
> These rules keep the suite fast, deterministic, and trustworthy.

## What this suite is

End-to-end Playwright tests that drive a real [`examples/full-site`](../../examples/full-site/) instance. Every first-party plugin is installed there — your specs exercise the full stack: Next.js → site-core → plugins → MongoDB.

> **Contributing:** this suite is the required-status-check on every PR. Before opening a PR, read [CONTRIBUTING.md](../../CONTRIBUTING.md) — it specifies the PR flow, which changes need a new spec, and the release workflow that depends on this suite staying green.

## Architecture at a glance

```
scripts/run-e2e.js         ← owns the whole lifecycle
  ├─ boots mongodb-memory-server (in-process)
  ├─ runs `next build --webpack` inside examples/full-site
  │   (set E2E_SKIP_BUILD=1 to reuse an existing .next/)
  ├─ spawns `next start` with test env vars (Mongo URI + AUTH_SECRET)
  ├─ waits for /api/auth/status, warms a handful of routes
  └─ execs `playwright test` → on exit, tears everything down

tests/e2e/
  playwright.config.js     ← no webServer, no baseURL hard-coding
  global-setup.js          ← resets DB, seeds super_admin
  global-teardown.js       ← clears the auth/ cache
  fixtures/
    auth.js                ← `adminPage`, `adminRequest` — pre-logged-in
    db.js                  ← `cleanDb` auto-fixture (wipes DB per test)
    factories.js           ← createPage / createContentType / …
  lib/
    mongo.js, seed.js, api.js, env.js
  specs/                   ← your specs live here
```

## Run the suite

```bash
pnpm test:e2e                # headless, one worker
pnpm test:e2e:ui             # Playwright UI mode — use for debugging
pnpm test:e2e:headed         # watch the browser
pnpm test:e2e -- specs/pages # run only specs under pages/
```

**First run downloads:** Playwright browsers (~200MB) and a MongoDB binary (~100MB). Subsequent runs are cached.

**Iterate faster:** `E2E_SKIP_BUILD=1 pnpm test:e2e` reuses the last `.next/` so only Playwright + Mongo boot. Rebuild when you change package code.

**seed gotcha:** site-core seeds a `Blog Article` content type at `urlPrefix=/blog` with a `hello-world` item on every fresh DB. Specs that create their own content types must use **different urlPrefixes** (not `/blog`) or filter them out, otherwise `ContentType.findOne({ urlPrefix: "/blog" })` returns an ambiguous result.

**Third-party credentials (DO Spaces, etc.):** put them in `tests/e2e/.env.test` (gitignored). The runner loads it and forwards to the Next.js process. Specs that need creds should gate on presence (`test.skip(!HAS_SPACES, "...")`) so a cloned repo without credentials still gets a green suite.

**Bucket safety:** every test run gets a unique `DO_SPACES_PREFIX=e2e-harness/<runId>/` synthesised by the runner, so uploads can never collide with production files. `globalTeardown` performs a list+delete sweep under that prefix as a safety net; [`lib/spaces.js`](./lib/spaces.js) refuses any prefix that doesn't start with `e2e-harness/`.

## The rules

### 1. Verify before reporting a change done

Any time you touch a package or the example site, run the suite. `pnpm test:e2e` from the repo root. If you can't run it (no deps installed, no network for the first download), say so explicitly — never claim green without proof.

### 2. Every user-visible feature needs at least one spec

- New package feature → extend the relevant spec file.
- New plugin → create `specs/plugins/<plugin-name>.spec.js` and add it to the plugin's PR.
- Bug fix → add a regression spec. Name the file after the symptom (`redirect-loop.spec.js`), not the cause.

### 3. Use factories and fixtures — don't reach into Mongo

- Create test data via [`fixtures/factories.js`](./fixtures/factories.js). Those helpers hit the same HTTP API the admin UI uses, so a passing spec means the full stack works, not just the DB layer.
- Authenticate via the `adminPage` / `adminRequest` fixtures from [`fixtures/auth.js`](./fixtures/auth.js). **Never walk through `/admin/login` manually in a spec** — only `specs/auth/login.spec.js` does that, by design.

If you genuinely need raw Mongo access (e.g. to assert a hook side-effect), use [`lib/mongo.js`](./lib/mongo.js) and justify it in a comment.

### 4. DB is reset per test by default

The `cleanDb` fixture in [`fixtures/db.js`](./fixtures/db.js) is auto-applied when you import `test` from that file — which is what every spec already does. Each test starts with:

- An empty DB
- One seeded `super_admin` (`admin@example.com` / `password12345`)

**Don't add `afterEach` cleanup.** Failures leave state intact for `--debug` / trace inspection.

### 5. Locators: user-facing first

Order of preference:

1. `page.getByRole("button", { name: "Sign In" })` — survives refactors.
2. `page.getByLabel("Email")` — form fields.
3. `page.getByText("…")` — text the user actually sees.
4. `page.locator("[data-testid=…]")` — add a testid to the component if none of the above works; don't reach for ant-design class names.

Ant Design's internal CSS class names (e.g. `.ant-btn-primary`) change between versions — using them is a future flake.

### 6. Web-first assertions only

No `page.waitForTimeout(…)`. Use:

- `await expect(locator).toBeVisible()` — retries automatically.
- `await page.waitForURL(/pattern/)` — retries until URL matches.
- `await page.waitForResponse(…)` — if you need a network assertion.

If an assertion needs to wait, `expect()` has built-in retry. If it still flakes, the feature is racy — fix the feature, don't loosen the test.

### 7. One behavior per test

If the description has "and" or "then", split it. "logs in **and** lands on /admin" is fine (one flow, one outcome). "creates a page **and** deletes it **and** …" is three tests.

### 8. Match test scope to the change

- Fixing the SEO score? Edit `specs/plugins/seo.spec.js` only; don't refactor unrelated specs.
- Adding a new admin page? New spec file — don't bloat existing ones.

### 9. Don't commit artefacts

Already gitignored at the repo root, but double-check before `git add`:

- `playwright-report/`
- `test-results/`
- `tests/e2e/.auth/`
- `tests/e2e/screenshots/` — per-test PNGs, overwritten each run (see below)
- `.mongodb-binaries/` (set by `mongodb-memory-server`)

### 9a. Screenshots

Every browser-backed test drops a full-page PNG at
`tests/e2e/screenshots/<dir>--<spec>--<test-title>.png` via the
`afterEach` hook in [`fixtures/db.js`](./fixtures/db.js). File names
are deterministic, so the folder only ever holds the **last run's**
images — no accumulation over time. Open them to debug visual
regressions without replaying the whole suite.

### 10. Debugging

- `pnpm test:e2e:ui` — Playwright's UI mode. Watch, timetravel, and pick locators.
- `PWDEBUG=1 pnpm test:e2e -- specs/pages/crud.spec.js` — steps through with the inspector.
- Failures drop a trace at `test-results/<spec>/trace.zip`. Open it with `pnpm exec playwright show-trace <path>`.

Don't edit a spec to be less strict to silence a flake. Find the race, fix it, or mark it `.fixme` with a comment linking to the issue.

### 11. Parallelism

The config runs **one worker**. The full-site harness is a single Next.js dev server with a single Mongo DB, so specs share global state. Don't set `fullyParallel: true` without also giving each test its own database.

## Adding specs for a new plugin

Template:

```js
// tests/e2e/specs/plugins/<plugin-name>.spec.js
import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
// import factories if you need to set up Pages/Globals/etc.

test.describe("<plugin-name> plugin", () => {
  test("<observable behavior>", async ({ page, adminRequest }) => {
    // arrange — use factories
    // act — navigate or hit an endpoint
    // assert — web-first expectations
  });
});
```

Before writing the spec, check that the plugin is wired into [`examples/full-site/site.config.js`](../../examples/full-site/site.config.js) and [`puck.config.js`](../../examples/full-site/puck.config.js), and that its package is in [`next.config.mjs`](../../examples/full-site/next.config.mjs) `transpilePackages`.

## When the harness itself breaks

Signs: every spec fails at `waitForHttp`, or the runner can't start Mongo.

1. `pnpm install` at the repo root — the Playwright/Mongo devDeps may be missing.
2. `pnpm exec playwright install chromium` — browser not downloaded.
3. Check that `examples/full-site` builds: `pnpm --filter premast-example-full-site build`. If it fails, that's a package bug, not a test bug — fix it in the package.
4. Check port 3100 isn't in use: `lsof -i :3100`. Override with `E2E_PORT=3200 pnpm test:e2e`.

Don't disable tests to work around harness bugs. Fix the harness or file an issue.
