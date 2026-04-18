# @premast/example-full-site

A fully-featured Premast CMS site. Used as:

- The **E2E test harness** for `tests/e2e/` (Playwright specs run against this).
- A **plugin showcase** — every first-party `@premast/site-plugin-*` is wired in, giving agents and humans a reference for what a complete site looks like.

## Run locally (outside the test runner)

```bash
cp .env.local.example .env.local   # point at a local Mongo
pnpm --filter premast-example-full-site dev
```

Open http://localhost:3000 → first visit redirects to `/admin/setup` to create the super admin.

## Do not

- Rename or remove `site.config.js`, `puck.config.js`, `middleware.js`, or the catch-all routes under `app/`. The E2E specs assume the starter shape.
- Add client-specific customisations that wouldn't exist in a freshly scaffolded site. This directory is a fixture, not a playground for unrelated experiments.

The structure must stay close to `templates/starter/`. The `scripts/lint-example-drift.js` check (run in CI) fails if files present in the starter are missing here.
