# Getting Started

## Prerequisites

- Node.js 18+
- MongoDB running locally or a MongoDB Atlas connection string
- GitHub personal access token (for installing `@premast/*` packages)

## 1. Generate a GitHub Token

Premast packages are hosted on GitHub Packages. You need a token to install them.

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Select scope: **`read:packages`**
4. Copy the token

Set it as an environment variable (add to your `~/.zshrc` or `~/.bashrc`):

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

## 2. Create a New Site

```bash
npx @premast/create-premast-site
```

The CLI will:
- Ask for a project name and which plugins to include
- Copy the starter template
- Configure `.npmrc` for GitHub Packages authentication
- Generate `site.config.js`, `next.config.mjs`, and `.env.local`
- Install dependencies
- Initialize a git repository

## 3. Configure Your Database

Edit `.env.local` in your new project:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=your_project_db
```

## 4. Start the Dev Server

```bash
cd your-project-name
npm run dev
```

## 5. Create Your Admin Account

Open [http://localhost:3000/admin/setup](http://localhost:3000/admin/setup) and create your first super admin account.

Then visit [http://localhost:3000/admin](http://localhost:3000/admin) to log in.

## 6. Customize Your Site

| What | File | Purpose |
|------|------|---------|
| Colors & fonts | `theme/tokens.js` | Design tokens (CSS variables) |
| Ant Design theme | `theme/antd-theme.js` | Admin panel theme overrides |
| Plugins | `site.config.js` | Register blocks, plugins, categories |
| Header/Footer | `components/layout/` | Site header and footer components |

## 7. Add Plugins

```bash
npm run add-plugin
```

This interactive command lets you select a plugin and automatically updates all config files (`package.json`, `site.config.js`, `puck.config.js`, `next.config.mjs`) and installs dependencies.

## 8. Update Premast

When a new version is released:

```bash
npm run update
```

This will:
- Update all `@premast/*` packages to the latest version
- Check for template file changes and show you diffs
- Let you accept, skip, or backup each changed file

---

## Project Structure

```
your-site/
  .premast.json           ← Version tracking (used by npm run update)
  .npmrc                  ← GitHub Packages auth
  site.config.js          ← Plugin registration + config
  puck.config.js          ← Client-safe Puck config (no mongoose)
  middleware.js            ← Auth middleware for /admin routes
  theme/
    tokens.js             ← Design tokens (colors, fonts)
    antd-theme.js         ← Ant Design theme mapping
    puck.css              ← Puck editor theme overrides
    ThemeRootVars.jsx      ← Injects CSS variables
  app/
    layout.jsx            ← Root layout
    antd-provider.jsx     ← Ant Design ConfigProvider
    (site)/
      layout.jsx          ← Public site layout (header/footer)
      page.jsx            ← Home page
      [...path]/page.jsx  ← Dynamic content item routes
    admin/
      layout.jsx          ← Admin panel layout
      login/              ← Login page
      setup/              ← First-time admin setup
      (dashboard)/        ← Protected admin pages
    api/
      [...route]/         ← Single catch-all → siteConfig.apiRouteHandlers
  components/
    admin/                ← Admin shell (local for Ant Design theme)
    layout/               ← Header, Footer
```

---

## GitHub Packages Authentication (Manual)

If you didn't use `create-premast-site`, add this `.npmrc` to your project root:

```ini
@premast:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install packages normally:

```bash
npm install @premast/site-core @premast/site-blocks
```
