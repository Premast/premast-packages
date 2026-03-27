# Premast CMS

A modular, plugin-based CMS built on **Next.js**, **Puck Editor**, **MongoDB**, and **Ant Design**. Designed as a monorepo of shared packages that power multiple client sites.

## Packages

| Package | Description |
|---------|-------------|
| [`@premast/site-core`](packages/site-core) | Database models, API handlers, auth, admin shell, plugin system |
| [`@premast/site-blocks`](packages/site-blocks) | Puck visual editor blocks (Heading, Text, Hero, Columns, etc.) |
| [`@premast/site-plugin-seo`](packages/site-plugin-seo) | SEO fields, meta tags, score analyzer, search indexing |
| [`@premast/create-premast-site`](packages/create-premast-site) | CLI to scaffold new client sites |

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- GitHub token with `read:packages` scope ([create one here](https://github.com/settings/tokens))

### Create a New Site

```bash
# Set your GitHub token (add to ~/.zshrc or ~/.bashrc)
export GITHUB_TOKEN=ghp_your_token_here

# Scaffold a new project
npx @premast/create-premast-site
```

### Configure & Run

```bash
cd your-project-name

# Edit .env.local with your MongoDB connection
# MONGODB_URI=mongodb://localhost:27017
# MONGODB_DB_NAME=your_db_name

# Start dev server
npm run dev
```

### Set Up Admin

1. Open [http://localhost:3000/admin/setup](http://localhost:3000/admin/setup)
2. Create your super admin account
3. Log in at [http://localhost:3000/admin](http://localhost:3000/admin)

### Update to Latest Version

```bash
npm run update
```

## Architecture

```
premast-packages/
  packages/
    site-core/              → @premast/site-core
    site-blocks/            → @premast/site-blocks
    site-plugin-seo/        → @premast/site-plugin-seo
    create-premast-site/    → CLI tool
  templates/
    starter/                → Template copied by CLI
  docs/                     → Documentation
```

### How It Works

1. **`create-premast-site`** scaffolds a Next.js project from the starter template
2. **`site.config.js`** is the central config — registers blocks, plugins, and categories
3. **Puck Editor** provides visual page building in the admin panel
4. **Plugins** extend the CMS with new blocks, fields, admin pages, and API routes
5. **`npm run update`** keeps client sites in sync with new template versions

### Client Site Structure

```
client-site/
  site.config.js          ← Central config (blocks + plugins)
  puck.config.js          ← Client-safe Puck config
  middleware.js            ← Auth middleware
  theme/
    tokens.js             ← Design tokens
    antd-theme.js         ← Ant Design theme
  app/
    (site)/               ← Public pages
    admin/                ← Admin panel
    api/[...route]/       ← Catch-all API route
```

## Documentation

- **[Getting Started](docs/getting-started.md)** — Full setup guide, GitHub token, project structure
- **[Developer Guide](docs/developer-guide.md)** — Day-to-day development: editing pages, creating blocks, using the editor
- **[Creating Plugins](docs/creating-plugins.md)** — How to build custom plugins
- **[Creating Client Sites](docs/creating-client-site.md)** — Manual site setup (without CLI)
- **[Publishing](docs/publishing.md)** — How to publish packages to GitHub Packages
- **[Roadmap](ROADMAP.md)** — Feature roadmap and version plan

## Plugin System

Plugins are functions that return a config object:

```js
export function myPlugin(options = {}) {
  return {
    name: "my-plugin",
    blocks: {},            // Puck blocks
    fields: {},            // Field injections
    categories: {},        // Editor categories
    adminPages: [],        // Admin sidebar pages
    apiRoutes: [],         // API endpoints
    models: {},            // Mongoose schemas
    hooks: {},             // Lifecycle hooks
  };
}
```

Register in `site.config.js`:

```js
import { createSiteConfig } from "@premast/site-core";
import { baseBlocks, baseCategories } from "@premast/site-blocks";
import { seoPlugin } from "@premast/site-plugin-seo";

export const siteConfig = createSiteConfig({
  blocks: baseBlocks,
  categories: baseCategories,
  plugins: [seoPlugin()],
});
```

See [Creating Plugins](docs/creating-plugins.md) for the full guide.

## Development (Monorepo)

```bash
# Clone and install
git clone https://github.com/Premast/premast-packages.git
cd premast-packages
pnpm install

# Publish all packages
pnpm publish:all
```

## License

Private — Premastlab
