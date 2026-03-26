# Getting Started

## Prerequisites

- Node.js 18+
- pnpm 10+ (`npm install -g pnpm`)
- MongoDB running locally or a MongoDB Atlas connection string

## Setting Up a New Client Site

### 1. Copy the starter template

```bash
cp -r templates/starter /path/to/client-site
cd /path/to/client-site
```

### 2. Install dependencies

```bash
pnpm install
```

During development, if you're working from the monorepo, dependencies resolve via `workspace:*`. For standalone client sites, publish the packages to GitHub Packages first (see below).

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=client_name_db
```

### 4. Customize the site

- **Design tokens**: Edit `theme/tokens.js` to change colors, fonts, etc.
- **Ant Design theme**: Edit `theme/antd-theme.js` to match your tokens.
- **Plugins**: Edit `site.config.js` to add/remove plugins.

### 5. Run the dev server

```bash
pnpm dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin

### 6. Add plugins

```bash
pnpm add @premast/site-plugin-seo
```

Then in `site.config.js`:
```js
import { seoPlugin } from "@premast/site-plugin-seo";

export const siteConfig = createSiteConfig({
  blocks: baseBlocks,
  categories: baseCategories,
  plugins: [
    seoPlugin(),
  ],
});
```

---

## Project Structure (Client Site)

```
client-site/
  site.config.js        ← Plugin registration + config
  theme/
    tokens.js           ← Design tokens (colors, fonts)
    antd-theme.js       ← Ant Design theme mapping
  app/
    layout.jsx          ← Root layout
    (site)/
      layout.jsx        ← Public site layout (header/footer)
      page.jsx          ← Home page
    admin/
      layout.jsx        ← Admin panel layout
      [...plugin]/      ← Auto-routes for plugin admin pages
    api/
      [...route]/       ← Single catch-all delegating to siteConfig
  components/           ← Client-specific components
```

---

## Installing Packages from GitHub Packages

For standalone client sites (not in the monorepo), configure npm to use the Premast registry:

```bash
# .npmrc in client site root
@premast:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install normally:
```bash
pnpm add @premast/site-core @premast/site-blocks
```
