# Premast Packages — Agent Rules

## Architecture

This is a **pnpm monorepo** with shared packages consumed by client Next.js sites.

```
premast-packages/
  packages/
    site-core/          → @premast/site-core (DB, API, admin, plugin system)
    site-blocks/        → @premast/site-blocks (Puck visual editor blocks)
    site-plugin-seo/    → @premast/site-plugin-seo (example plugin)
    site-plugin-*/      → additional plugins
  templates/
    starter/            → starter template for new client sites
  docs/                 → documentation
```

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Core packages | `@premast/site-*` | `@premast/site-core`, `@premast/site-blocks` |
| Plugins | `@premast/site-plugin-*` | `@premast/site-plugin-seo`, `@premast/site-plugin-stripe` |
| Client sites | Any name | `acme-website`, `client-name-site` |

## Critical: Ant Design Components Must Be Local

Ant Design components that use `theme.useToken()` or `ConfigProvider` context **MUST live in the client project**, not in `@premast/site-core`. Symlinked packages resolve a separate copy of `antd`, creating a dual React context where theme tokens don't propagate.

**Pattern:** Data and logic from packages, React UI from local components.

```
@premast/site-core  → exports siteConfig.adminSidebarItems (data)
client project      → AdminAppLayout.jsx, AdminSidebar.jsx (local, uses data)
```

The admin shell components (`AdminAppLayout`, `AdminSidebar`) are included in `templates/starter/components/admin/` and should be copied to each client site. They import `designTokens` locally and receive `sidebarItems` from `siteConfig`.

Similarly, `ThemeRootVars` lives in `theme/ThemeRootVars.jsx` in the client project, calling `getRootCssVariablesCss()` from `@premast/site-core/theme` with local tokens.

## Package Rules

### Imports in packages (site-core, site-blocks, plugins)

- **NEVER** use `@/` path alias — it resolves to the consuming client's root, not the package
- Use **relative imports** within the package: `./`, `../`
- Use **package names** for cross-package imports: `@premast/site-core`
- Mongoose must be imported as `import mongoose from "mongoose"` (peer dependency)

### "use client" directive

- Components that use React hooks, browser APIs, or Ant Design interactive components MUST have `"use client"` at the top
- Examples: `AdminSidebar.jsx`, `AdminAppLayout.jsx`, `RichTextField.jsx`
- Server-safe components (render functions in blocks) must NOT have `"use client"`

### Mongoose model pattern

Always use the HMR-safe pattern:
```js
export const MyModel = mongoose.models.MyModel ?? mongoose.model("MyModel", mySchema);
```

### CSS in packages

- Use **CSS Modules** (`.module.css`) for component styles
- Reference theme via **CSS custom properties**: `var(--theme-accent)`, `var(--theme-text)`, etc.
- These variables are injected by the client's `ThemeRootVars` component
- Do NOT import design tokens directly in package CSS — use CSS variables

## Plugin Interface

Every plugin is a **function** returning a config object:

```js
export function myPlugin(options = {}) {
  return {
    name: "my-plugin",       // required, unique string
    version: "1.0.0",        // optional semver
    blocks: {},               // Puck component definitions
    fields: {},               // Field injections into existing blocks
    categories: {},           // Puck editor categories
    adminPages: [],           // Admin sidebar items with React components
    apiRoutes: [],            // API endpoints (path, method, handler)
    models: {},               // Mongoose schema definitions (NOT models)
    hooks: {},                // Lifecycle hooks
  };
}
```

### Plugin API route handlers

Signature: `async (request, params, context) => Response`

- `context.connectDB` — connects to MongoDB
- `context.models` — all registered Mongoose models
- `context.hooks` — all registered lifecycle hooks

### Plugin admin pages

The admin `[...plugin]` catch-all route renders plugin components. Each `adminPages` entry needs:
- `key` — unique identifier
- `label` — sidebar text
- `icon` — Ant Design icon name string (e.g., `"SearchOutlined"`)
- `path` — URL path (e.g., `/admin/seo`)
- `component` — React component to render

## Client Site Structure

```
client-site/
  site.config.js        ← createSiteConfig() — THE central config file
  theme/tokens.js       ← client's design tokens
  theme/antd-theme.js   ← client's Ant Design theme
  app/
    api/[...route]/     ← single catch-all → siteConfig.apiRouteHandlers
    admin/[...plugin]/  ← catch-all for plugin admin pages
    (site)/             ← public site pages
```

### Key file: `site.config.js`

This is where blocks, plugins, and categories are registered:

```js
import { createSiteConfig } from "@premast/site-core";
import { baseBlocks, baseCategories } from "@premast/site-blocks";

export const siteConfig = createSiteConfig({
  blocks: baseBlocks,
  categories: baseCategories,
  plugins: [],
});
```

`siteConfig` provides: `puckConfig`, `adminSidebarItems`, `apiRouteHandlers`, `mongooseModels`, `connectDB`, `hooks`.

## When adding new functionality

- **New Puck block for all clients** → add to `@premast/site-blocks`
- **New feature (SEO, payments, AI)** → create a new `@premast/site-plugin-*`
- **Client-specific block** → add in client's own `components/puck/` directory
- **Bug fix in shared code** → fix in the relevant package, publish new version
- **New API endpoint** → if shared, add to site-core or a plugin; if client-specific, add a custom route in the client

## File extensions

- `.jsx` for files containing JSX
- `.js` for pure logic, configs, and non-JSX modules
- `.module.css` for CSS Modules

## next.config.mjs (client sites)

Client sites MUST include `transpilePackages` for all `@premast/*` packages:

```js
const nextConfig = {
  serverExternalPackages: ["mongoose"],
  transpilePackages: [
    "@premast/site-core",
    "@premast/site-blocks",
    // ... all installed @premast plugins
  ],
};
```
