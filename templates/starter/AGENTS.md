# Premast Client Site — Agent Rules

> **Read this before making ANY changes.** Breaking these rules will crash the site.

## What This Project Is

This is a **Premast CMS client site** — a Next.js application powered by shared `@premast/*` packages. The packages provide the CMS engine (database, API, admin panel, visual editor). This project customizes the look and content.

## Project Structure

```
├── site.config.js          ← Central config: blocks, plugins, categories
├── puck.config.js          ← Client-safe Puck config (NO mongoose)
├── middleware.js            ← Auth middleware (protects /admin)
├── .premast.json           ← Version tracking (used by npm run update)
├── theme/
│   ├── tokens.js           ← Design tokens (colors, fonts, spacing)
│   ├── antd-theme.js       ← Ant Design theme for admin panel
│   ├── puck.css            ← Puck editor theme overrides
│   └── ThemeRootVars.jsx   ← Injects CSS variables into page
├── app/
│   ├── layout.jsx          ← Root layout (ThemeRootVars + AntdProvider)
│   ├── antd-provider.jsx   ← Ant Design ConfigProvider wrapper
│   ├── (site)/             ← Public pages
│   │   ├── layout.jsx      ← Header + Footer wrapper
│   │   ├── page.jsx        ← Home page
│   │   └── [...path]/      ← Dynamic content item routes
│   ├── admin/
│   │   ├── layout.jsx      ← Admin shell layout
│   │   ├── login/          ← Login page (thin wrapper, imports from site-core)
│   │   ├── setup/          ← First-time admin setup (thin wrapper)
│   │   └── (dashboard)/    ← Catch-all route delegates to site-core
│   └── api/
│       └── [...route]/     ← Single catch-all → siteConfig.apiRouteHandlers
├── components/
│   ├── layout/             ← Header.jsx, Footer.jsx
│   ├── puck/               ← Client-specific Puck blocks
│   └── seo/                ← SEO field components
└── next.config.mjs         ← Webpack aliases + transpilePackages
```

## Critical Rules — DO NOT BREAK

### 1. Never edit files inside `node_modules/@premast/*`

These are installed packages. Edits will be lost on `npm install`. If you need to change package behavior, either:
- Override in this project's files
- Fix in the `premast-packages` monorepo and publish a new version

### 2. site.config.js and puck.config.js must stay in sync

Both files register the same blocks and categories. `site.config.js` is used on the server (has mongoose access). `puck.config.js` is used in `"use client"` components (NO mongoose).

**If you add a new block**, add it to BOTH files.

### 3. Never import mongoose in "use client" files

Mongoose is server-only. If you import it in a client component, the build will fail or bundle 2MB+ of Node.js code into the browser.

```js
// ✅ Server component or API route
import { siteConfig } from "@/site.config"; // has mongoose

// ✅ Client component
import { puckConfig } from "@/puck.config"; // no mongoose

// ❌ Client component — WILL BREAK
import { siteConfig } from "@/site.config"; // pulls in mongoose
```

### 4. Never remove or rename these files

| File | Why |
|------|-----|
| `site.config.js` | Everything depends on it |
| `puck.config.js` | All Puck editors import it |
| `middleware.js` | Auth breaks without it |
| `app/api/[...route]/route.js` | All API endpoints stop working |
| `app/admin/layout.jsx` | Admin panel won't render |
| `theme/ThemeRootVars.jsx` | All CSS variables disappear |
| `next.config.mjs` | Build fails without transpilePackages |

### 5. "use client" rules

| Needs "use client" | Does NOT need "use client" |
|---|---|
| Components with `useState`, `useEffect` | Puck block `render` functions |
| Components using `antd` interactive elements | `app/(site)/page.jsx` and layouts |
| Event handlers (`onClick`, etc.) | API route handlers |

### 6. CSS — always use theme variables

```css
/* ✅ Correct */
.card { background: var(--theme-surface); color: var(--theme-text); }

/* ❌ Wrong — hardcoded values break theming */
.card { background: #232323; color: white; }
```

### 7. next.config.mjs — don't remove aliases or transpilePackages

The webpack aliases force a single copy of `react`, `antd`, etc. Removing them breaks the admin panel theme. The `transpilePackages` list tells Next.js to process `@premast/*` JSX.

**If you install a new `@premast/*` plugin**, add it to `transpilePackages`.

### 8. API routes are catch-all

ALL API endpoints go through `app/api/[...route]/route.js`. Do NOT create individual route files like `app/api/pages/route.js` — they will conflict.

To add a custom API endpoint, add it to a plugin's `apiRoutes` or handle it in the catch-all.

## Common Tasks

### Add a new Puck block

1. Create `components/puck/MyBlock.jsx`
2. Add to `site.config.js` → `blocks: { ...baseBlocks, MyBlock }`
3. Add to `puck.config.js` → same
4. Add to a category in both files
5. Restart dev server

### Change theme colors

Edit `theme/tokens.js` — hot reloads automatically.

### Add a new plugin

```bash
npm install @premast/site-plugin-xyz
```

Then in `site.config.js`:
```js
import { xyzPlugin } from "@premast/site-plugin-xyz";
plugins: [seoPlugin(), xyzPlugin()]
```

And in `next.config.mjs`:
```js
transpilePackages: [..., "@premast/site-plugin-xyz"]
```

### Update Premast packages

```bash
npm run update
```

### Change header/footer

- **Via admin panel**: Admin → Global → Header/Footer → Edit in Puck
- **Via code**: Edit `components/layout/Header.jsx` or `Footer.jsx`

## Auth System

- JWT stored in HTTP-only cookies
- `middleware.js` redirects unauthenticated users from `/admin` to `/admin/login`
- `/admin/setup` creates first admin (disabled after first user exists)
- Roles: `super_admin` (full access), `editor` (limited)

## Database Models

| Model | Purpose | API |
|-------|---------|-----|
| Page | Standalone pages (Home, About) | `/api/pages` |
| ContentType | Content type blueprints (Blog, Service) | `/api/content-types` |
| ContentItem | Individual content pieces | `/api/content-items` |
| Global | Header & Footer | `/api/globals` |
| User | Admin users | `/api/auth/*` |

## File Extension Rules

- `.jsx` — files containing JSX
- `.js` — pure logic, configs, non-JSX
- `.module.css` — CSS Modules (scoped styles)
