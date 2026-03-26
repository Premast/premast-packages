# Publishing Packages

All `@premast/*` packages are published to **GitHub Packages** (private npm registry tied to your GitHub organization).

## How Publishing Works

```
git tag v0.1.0
git push origin v0.1.0
```

That's it. The GitHub Actions workflow (`/.github/workflows/publish.yml`) automatically:

1. Installs dependencies
2. Runs `pnpm build:cli` (copies `templates/starter/` into the CLI package)
3. Sets all package versions to match the tag (e.g., `v0.1.0` → `0.1.0`)
4. Publishes all packages to GitHub Packages

## Packages Published

| Package | Registry Name |
|---------|--------------|
| `@premast/site-core` | `@premast/site-core` |
| `@premast/site-blocks` | `@premast/site-blocks` |
| `@premast/site-plugin-seo` | `@premast/site-plugin-seo` |
| `create-premast-site` | `create-premast-site` |

## First-Time Setup

### 1. Create the GitHub repository

Create a repo under your GitHub organization (e.g., `premastlab/premast-packages`).

### 2. Push the monorepo

```bash
cd premast-packages
git remote add origin git@github.com:premastlab/premast-packages.git
git push -u origin main
```

### 3. Publish the first version

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow runs automatically. Check the **Actions** tab on GitHub to see progress.

### 4. Verify packages are published

```bash
npm view @premast/site-core --registry https://npm.pkg.github.com
```

## Publishing Manually (if needed)

If GitHub Actions isn't available or you want to publish from your machine:

```bash
# 1. Set your GitHub token
export GITHUB_TOKEN=ghp_your_token_here

# 2. Build the CLI
pnpm build:cli

# 3. Publish all packages
pnpm publish:all
```

## Version Bumping

All packages share the same version (set by the git tag). To release a new version:

```bash
# After merging your changes to main:
git tag v0.2.0
git push origin v0.2.0
```

The workflow updates all `package.json` versions automatically during publish.

## Client Site Configuration

For client sites to install from GitHub Packages, they need an `.npmrc` file:

```
@premast:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

The `GITHUB_TOKEN` needs `read:packages` scope. Set it as an environment variable or in `~/.npmrc` on the developer's machine.

For CI/CD deployments (Vercel, Railway, etc.), set `GITHUB_TOKEN` as an environment variable in the hosting platform's settings.
