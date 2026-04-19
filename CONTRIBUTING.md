# Contributing to Premast Packages

Canonical reference for how changes land in this monorepo. Everything else — commit messages, release notes, `AGENTS.md`'s publishing section — should agree with this document or be updated.

## TL;DR

- **Every change is a PR against `main`.** No direct commits to `main`.
- **`main` is always green** — the `E2E` check is required before merge.
- **Releases are separate events**, not mixed into feature PRs. A release is a version-bump commit + tag + automated publish.
- **Patches (x.y.Z) ship immediately** for regressions in already-published versions. Don't batch them.

## The PR workflow

### 1. Branch naming

- `feat/<short-description>` — new feature (new plugin, new extension point)
- `fix/<short-description>` — bug fix
- `chore/<short-description>` — tooling, CI, docs, dependency bumps
- `release/<version>` — the version-bump PR itself (see [Release workflow](#release-workflow) below)

Branch off `main`. Rebase, don't merge, when `main` moves under you.

### 2. Scope one PR = one coherent change

If a PR touches more than one of these, split it:

- A new plugin package
- A new extension point in `site-core`
- A change to `templates/starter`
- An E2E spec for behaviour already covered

"Coherent" means the PR's commits could be squashed into a single sentence. "Add media plugin and a fieldTypes hook and flip UI blocks to use it and drop a peer dep and…" — that's three or four PRs, even if they depend on each other. Stack them as separate PRs against each other if needed.

Small PRs are reviewable and revertable. Big PRs are firefighting risk — this was the lesson from v1.8.0.

### 3. Every user-visible change needs a spec

- New package feature → extend the relevant spec file.
- New plugin → create `tests/e2e/specs/plugins/<plugin-name>.spec.js` in the same PR.
- Bug fix → regression spec named after the symptom, not the cause.
- See [tests/e2e/AGENTS.md](tests/e2e/AGENTS.md) for the full spec rules.

### 4. CI must be green before merge

The `E2E` check on every PR runs the full Playwright suite against `examples/full-site`. It's a required status check on `main` (see [Branch protection](#branch-protection-on-main)).

Don't merge red. Don't merge yellow. Re-run the job if it flakes, but if it fails twice, fix the underlying race — don't loosen the assertion. Spec rule #6 in `tests/e2e/AGENTS.md` is the policy.

### 5. Squash-merge by default

Keeps `main`'s history one commit per PR, which makes `git log` on `main` a release-ready changelog. The PR title becomes the commit subject — write it accordingly.

Exception: **release PRs** (see below) should be rebase-merged so the tag points at a clean version-bump commit.

## Release workflow

A release is its own PR. It contains **only** the version bump — no code changes, no new features, no bug fixes snuck in.

### Steps

1. **Open a `release/x.y.z` branch.** Bump `packages/site-core/package.json` to the target version.
2. **Run `node scripts/sync-versions.js --fix`.** Syncs every package's version to match site-core. If you added a new package, add it to `PACKAGES` in that script first.
3. **Also update the internal `version` string** in any plugin factory that hardcodes it (e.g. `mediaPlugin()` in `packages/site-plugin-media/src/index.js`). Grep: `version:\s*["']\d`.
4. **Commit:** `Release vX.Y.Z — <one-line highlight>`. The commit body should summarise what's landing since the last tag — headline features and breaking changes, not a list of PRs.
5. **Open the PR against `main`.** CI runs like any other PR. Merge when green (rebase-merge, not squash).
6. **Tag on `main`** after the merge: `git tag -a vX.Y.Z -m "..."` then `git push origin vX.Y.Z`.
7. **Tag push triggers the publish workflow** (`.github/workflows/publish.yml`). It re-syncs versions from the tag, builds the CLI, and runs `pnpm -r publish`. No manual `pnpm publish:all` needed unless the workflow breaks.
8. **Create the GitHub release:** `gh release create vX.Y.Z --title "..." --notes "..."`. Notes should be user-facing, not a commit dump — highlights, upgrade instructions, migration notes.

### Semver policy

| Version bump | What triggers it |
|---|---|
| **Major (x.0.0)** | Breaking API change: renaming/removing exports, changing `createSiteConfig`'s signature, changing a plugin-interface field's shape. |
| **Minor (1.x.0)** | New feature: new plugin, new extension point, new block, new admin page. Additive only. |
| **Patch (1.8.x)** | Bug fix, doc fix, non-breaking refactor, CI fix. No new functionality. |

Every consumer of `@premast/*` should be able to upgrade a patch blindly, a minor with a readme skim, and a major with migration notes.

### Patch cadence

Ship patches **on demand**. A regression in a published version (like the `slot` walker bug in v1.8.0) should hit the registry within hours, not wait for the next scheduled release. Open a `fix/` PR → merge → immediately open a `release/x.y.Z+1` PR.

### Minor cadence

No fixed schedule. Release when accumulated changes have user value — typically once a handful of plugin / site-core PRs have landed. Weekly is a reasonable ceiling at current scale.

## Branch protection on `main`

`main` must be configured in GitHub repo settings to:

- **Require a pull request before merging** (no direct commits).
- **Require status checks to pass** — the `E2E` job is required.
- **Require linear history** (prevents merge commits; aligns with squash/rebase-merge).
- **Disallow force-pushes.** Ever.

If these settings aren't enabled, the process above is only guidance and the repo's integrity depends on everyone remembering. Enable them.

## Hotfixes mid-flight

If a regression ships and feature work is in flight:

1. Branch `fix/<symptom>` **off the latest release tag** (`git checkout -b fix/slot-walker v1.8.0`), not off `main`.
2. PR it into `main` like any other fix.
3. Immediately open `release/x.y.Z+1` — patch release, publish.
4. Feature branches rebase onto the new `main` when they next touch it. No cherry-picking between unrelated lines of work.

Don't stack hotfixes on top of WIP feature branches.

## Commit messages

- **Subject line** ≤ 70 chars, imperative mood ("Add media plugin", not "Added" or "Adding").
- **Body** explains *why*, not *what* — the diff shows what. Reference issues / PRs with full URLs.
- **Co-author trailer** for paired work: `Co-Authored-By: Name <email>`.
- Release commits: `Release vX.Y.Z — <headline>`.

## What not to do

- Don't commit directly to `main` (branch protection should prevent this; if it lets you, the rule is broken).
- Don't mix release bumps with feature changes.
- Don't publish from a dirty working tree (`pnpm publish:all` uses `--no-git-checks` — use it only when the workflow is broken, not to sidestep review).
- Don't bypass the E2E check with `admin override`. If the check is wrong, fix the check.
- Don't edit or unpublish a released version. Ship a patch instead.

## Where else to look

- [AGENTS.md](AGENTS.md) — architectural rules (file layout, HMR-safe mongoose, plugin interface)
- [docs/creating-plugins.md](docs/creating-plugins.md) — how to build a new plugin
- [docs/publishing.md](docs/publishing.md) — publish mechanics (the `what-happens-when-I-push-a-tag` details)
- [tests/e2e/AGENTS.md](tests/e2e/AGENTS.md) — E2E suite rules
