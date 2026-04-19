# Publishing Packages

Mechanics of how `@premast/*` packages reach the GitHub Packages registry. For the *process* around publishing (PRs, semver policy, branch protection, release cadence), see [CONTRIBUTING.md](../CONTRIBUTING.md).

## How publishing happens

Two paths end up at the same place:

### Path A — automated (the expected one)

```bash
git tag -a v1.8.1 -m "Release v1.8.1 — <headline>"
git push origin v1.8.1
```

The tag push triggers [`.github/workflows/publish.yml`](../.github/workflows/publish.yml), which:

1. Checks out the tagged commit
2. Installs deps with `pnpm install --frozen-lockfile` (authenticated via `GITHUB_TOKEN`)
3. Syncs every package's `package.json` version to match the tag (`node scripts/sync-versions.js <version>`)
4. Runs `pnpm build:cli` (copies `templates/starter/` into the CLI package)
5. Runs `pnpm -r publish --no-git-checks` — publishes every workspace package (excluding `premast-example-full-site` and other `private: true` packages)

The workflow is the single source of truth for what gets published. Add new packages to `scripts/sync-versions.js`'s `PACKAGES` array and they're picked up automatically.

### Path B — manual (only when the workflow is broken)

```bash
# Ensure GITHUB_TOKEN is in your shell with write:packages scope.
export GITHUB_TOKEN=ghp_…

# Syncs versions, builds CLI, publishes all.
pnpm publish:all
```

Use this only as a fallback. If you're manually publishing more than once, the workflow needs fixing — don't normalise it.

## Packages published

As of v1.8.x the workspace publishes 7 packages:

| Package | Purpose |
|---|---|
| `@premast/site-core` | DB, API, auth, admin, plugin system |
| `@premast/site-plugin-seo` | Sitemap, robots, SEO fields, score analyzer |
| `@premast/site-plugin-ui` | Ant Design block library |
| `@premast/site-plugin-mcp` | AI agent integration via Model Context Protocol |
| `@premast/site-plugin-i18n` | Multilingual content + routing |
| `@premast/site-plugin-media` | Media library backed by S3 / DO Spaces |
| `@premast/create-premast-site` | CLI: scaffold, update, add-plugin |

The `premast-example-full-site` workspace is `"private": true` and never published.

## Version source of truth

`packages/site-core/package.json`'s `version` field. [`scripts/sync-versions.js`](../scripts/sync-versions.js) reads it and enforces that every other package matches.

CI fails on version drift. Run `node scripts/sync-versions.js --fix` to auto-align before committing a release.

## Auth

### Developer machines

```
# ~/.npmrc
//npm.pkg.github.com/:_authToken=ghp_…
```

Token needs `read:packages` to install, `write:packages` to publish. The repo-local `.npmrc` already sets `@premast:registry=https://npm.pkg.github.com`.

### Client sites

Same `.npmrc` pattern. For CI/CD (Vercel, Railway, etc.), set `GITHUB_TOKEN` as an environment variable in the hosting platform.

### The publish workflow itself

Uses `secrets.GITHUB_TOKEN`, which is injected by GitHub Actions automatically. No manual setup — just make sure the repo's **Actions → General → Workflow permissions** is set to "Read and write permissions".

## First-time setup (new repo)

If you're standing up a fresh monorepo:

1. Push to `main`, confirm `.github/workflows/e2e.yml` runs green.
2. `git tag -a v0.1.0 -m "Initial release"` → `git push origin v0.1.0`.
3. Watch the **Actions** tab. The publish job should finish in ~2 minutes.
4. Verify: `npm view @premast/site-core version --registry=https://npm.pkg.github.com`.

## Adding a new package to the monorepo

1. `packages/site-plugin-<name>/package.json` — set version to whatever the current tag is (e.g. `1.8.1`). Use `workspace:*` for any `@premast/*` deps. Set `publishConfig.registry` to `https://npm.pkg.github.com`.
2. Add the path to `PACKAGES` in [`scripts/sync-versions.js`](../scripts/sync-versions.js).
3. Add the entry to `AVAILABLE_PLUGINS` in [`packages/create-premast-site/src/add-plugin.js`](../packages/create-premast-site/src/add-plugin.js) so `npm run add-plugin` offers it.
4. Add it to the "Packages published" table above.
5. First publish happens automatically on the next tag — no workflow change needed because `pnpm -r publish` picks up every non-private workspace member.

## When publishing fails

- **401 Unauthorized** — token doesn't have `write:packages` scope. Regenerate.
- **409 Conflict / version exists** — the version is already published. Versions are immutable; bump and re-release.
- **Drift error from sync-versions** — package.json versions are out of sync. Run `--fix` and commit the result.
- **Workflow skipped some packages** — the workflow no longer hardcodes package names (it uses `pnpm -r publish`), so this shouldn't recur. If it does, check that the new package isn't `"private": true`.

## See also

- [CONTRIBUTING.md](../CONTRIBUTING.md) — release workflow (when and how to cut a release)
- [docs/ROADMAP.md](ROADMAP.md) — what's shipped, what's planned
