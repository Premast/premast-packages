# Premast Packages — Agent Rules

> **Read this before making ANY changes.** These rules prevent breaking the system.

## Architecture

This is a **pnpm monorepo** with shared packages consumed by client Next.js sites.

```
premast-packages/
  packages/
    site-core/              → @premast/site-core (DB, API, auth, admin, plugin system)
    site-blocks/            → @premast/site-blocks (Puck visual editor blocks)
    site-plugin-seo/        → @premast/site-plugin-seo (SEO fields, score analyzer)
    site-plugin-*/          → additional plugins
    create-premast-site/    → CLI to scaffold + update client sites
  templates/
    starter/                → Template copied by create-premast-site CLI
  docs/                     → Documentation
```

## Critical Rules

### 1. Never use `@/` in packages

The `@/` alias resolves to the **consuming client's root**, not the package's root. Always use relative imports inside packages.

```js
// ✅ Inside a package
import { connectDB } from "../db/index.js";
import { MyModel } from "./models/MyModel.js";

// ❌ Will break
import { connectDB } from "@/db/index.js";
```

### 2. Mongoose must use HMR-safe pattern

```js
export const MyModel = mongoose.models.MyModel ?? mongoose.model("MyModel", mySchema);
```

Without the `??` guard, Next.js HMR will throw "Cannot overwrite model" errors.

### 3. Mongoose is a peer dependency

Import as `import mongoose from "mongoose"` — never add it as a direct dependency in packages. It's listed in `peerDependencies` and resolved from the client's `node_modules`.

### 4. "use client" rules

| Needs "use client" | Does NOT need "use client" |
|---|---|
| React hooks (`useState`, `useEffect`) | Puck block `render` functions |
| Browser APIs (`window`, `document`) | Server components |
| Ant Design interactive components | Pure data/logic modules |
| Event handlers (`onClick`, `onChange`) | Mongoose models and schemas |

### 5. CSS in packages — use CSS variables, not imports

```css
/* ✅ Good — uses CSS custom properties */
.card { background: var(--theme-surface); color: var(--theme-text); }

/* ❌ Bad — imports tokens directly */
@import "../theme/tokens.js";
```

Variables (`--theme-*`) are injected by `ThemeRootVars` in the client project.

### 6. Ant Design + resolve aliases

Client sites use webpack `resolve.alias` in `next.config.mjs` to force a single copy of `react`, `react-dom`, `antd`, and `@ant-design/icons`. This means Ant Design components CAN live in packages — the alias ensures they share the client's `ConfigProvider` context.

For local development with `file:` links, the dev server must use `--webpack` flag (Turbopack doesn't support absolute path aliases).

### 7. Puck blocks — render must be server-safe

Block `render` functions run in both server (SSR) and client contexts. Do NOT use hooks or browser APIs in render. If interactivity is needed, wrap in a separate `"use client"` component.

```js
// ✅ Server-safe render
render: ({ text }) => <p>{text}</p>

// ❌ Breaks SSR
render: ({ text }) => {
  const [state, setState] = useState(text);
  return <p>{state}</p>;
}
```

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Core packages | `@premast/site-*` | `@premast/site-core`, `@premast/site-blocks` |
| Plugins | `@premast/site-plugin-*` | `@premast/site-plugin-seo` |
| Client sites | Any name | `acme-website` |
| File extensions | `.jsx` for JSX, `.js` for logic | `AdminSidebar.jsx`, `config.js` |
| CSS | `.module.css` for CSS Modules | `Header.module.css` |

## Package Structure

### site-core

```
src/
  admin/          → Admin sidebar builder, admin components (AdminAppLayout, AdminSidebar)
  api/            → Route builder, route matcher, request handlers
  auth/           → JWT, password hashing, middleware, session hooks
  db/             → MongoDB connection, models (Page, ContentType, ContentItem, Global, User)
  puck/           → Puck config builder, Ant Design field overrides
  theme/          → CSS variable generator, condensed Puck CSS
  config.js       → createSiteConfig() — the central factory
  plugin.js       → Plugin normalization
```

### site-blocks

```
src/
  blocks/         → Puck block definitions (Hero, Text, Heading, Columns, etc.)
  fields/         → Custom field components (RichTextField)
  styles/         → CSS Modules for blocks
  index.js        → Exports baseBlocks + baseCategories
```

### site-plugin-seo

```
src/
  fields/         → SeoScoreField, seo-analyzer
  models/         → SeoMeta schema
  handlers/       → API handlers for SEO data
  admin/          → SeoAdminPage
  index.js        → Plugin factory function
  editor.js       → Client-safe exports (fields only, no mongoose)
  server.js       → Server-safe exports (models, handlers)
```

## Plugin Interface

```js
export function myPlugin(options = {}) {
  return {
    name: "my-plugin",       // required, unique string
    version: "1.0.0",        // optional semver
    blocks: {},               // Puck component definitions
    fields: {},               // Field injections into root fields
    categories: {},           // Puck editor categories
    adminPages: [],           // Admin sidebar items { key, label, icon, path, component }
    apiRoutes: [],            // API endpoints { path, method, handler }
    models: {},               // Mongoose schema definitions (NOT models)
    hooks: {},                // Lifecycle hooks
  };
}
```

### Plugin API route handler signature

```js
async (request, params, context) => Response
// context.connectDB — connects to MongoDB
// context.models    — all registered Mongoose models
// context.hooks     — all registered lifecycle hooks
```

### Plugin split: editor.js vs server.js

Plugins that have both client and server code should split exports:
- `editor.js` — client-safe (fields, UI components). NO mongoose imports.
- `server.js` — server-safe (models, API handlers). Can import mongoose.
- `index.js` — the plugin factory. Imports from both.

## When Adding New Functionality

| What | Where | Why |
|------|-------|-----|
| New Puck block for all clients | `@premast/site-blocks` | Shared across all sites |
| New feature (SEO, payments, AI) | New `@premast/site-plugin-*` | Modular, optional |
| Client-specific block | Client's `components/puck/` | Only for that site |
| Bug fix in shared code | The relevant package | Fix once, all sites benefit |
| New API endpoint (shared) | `site-core` or a plugin | Available to all sites |
| New API endpoint (one client) | Client's custom route | Only for that site |

## Client Site Config

### next.config.mjs requirements

```js
const nextConfig = {
  serverExternalPackages: ["mongoose"],
  transpilePackages: [
    "@premast/site-core",
    "@premast/site-blocks",
    // ... all installed @premast plugins
  ],
  turbopack: {},
  webpack(config) {
    // Resolve aliases for react, react-dom, antd, @ant-design/icons
    // Forces single copy when using file: linked packages
    Object.assign(config.resolve.alias, aliases);
    return config;
  },
};
```

### site.config.js — the central config

```js
import { createSiteConfig } from "@premast/site-core";
import { baseBlocks, baseCategories } from "@premast/site-blocks";

export const siteConfig = createSiteConfig({
  blocks: baseBlocks,
  categories: baseCategories,
  plugins: [],
});
```

Provides: `puckConfig`, `adminSidebarItems`, `apiRouteHandlers`, `mongooseModels`, `connectDB`, `hooks`.

### puck.config.js — client-safe Puck config

Same blocks/categories but imported without mongoose. Used in `"use client"` editor components to avoid pulling mongoose into the browser bundle.

## Auth System

- JWT-based, stored in HTTP-only cookies
- `middleware.js` protects `/admin` routes (redirects to `/admin/login`)
- `/admin/setup` creates the first super admin (one-time, disabled after first user exists)
- Roles: `super_admin`, `editor`
- Auth handlers in `@premast/site-core/auth`

## Database Models

| Model | Fields | Purpose |
|-------|--------|---------|
| Page | title, slug, content, published | Standalone pages |
| ContentType | name, slug, urlPrefix, templateContent | Content type blueprints |
| ContentItem | title, slug, contentType, content, metadata, published | Individual content pieces |
| Global | key (header/footer), content, published | Shared elements |
| User | email, passwordHash, name, role | Authentication |

## Publishing

1. Bump versions in all `package.json` files
2. `git tag -a vX.Y.Z -m "description"`
3. `pnpm publish:all`
4. `gh release create vX.Y.Z --title "..." --notes "..."`
