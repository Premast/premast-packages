# Creating Plugins

Plugins extend the Premast site system with new Puck blocks, admin pages, API routes, and database models.

## Plugin Structure

A plugin is a **function** that returns a **configuration object**:

```js
export function myPlugin(options = {}) {
  return {
    name: "my-plugin",         // Required, unique
    version: "1.0.0",          // Optional
    blocks: {},                // Puck block definitions
    fields: {},                // Field injections into existing blocks
    categories: {},            // Puck editor categories
    adminPages: [],            // Admin sidebar pages
    apiRoutes: [],             // API route handlers
    models: {},                // Mongoose schemas
    hooks: {},                 // Lifecycle hooks
  };
}
```

## Quick Start: Create a Plugin

### 1. Scaffold the package

```bash
mkdir packages/site-plugin-my-feature
cd packages/site-plugin-my-feature
```

Create `package.json`:
```json
{
  "name": "@premast/site-plugin-my-feature",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.js"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

### 2. Create the plugin entry

`src/index.js`:
```js
import { MyBlock } from "./blocks/MyBlock.jsx";
import { MyAdminPage } from "./admin/MyAdminPage.jsx";

export function myFeaturePlugin(options = {}) {
  return {
    name: "my-feature",
    version: "1.0.0",
    blocks: {
      MyBlock,
    },
    categories: {
      myFeature: {
        title: "My Feature",
        components: ["MyBlock"],
      },
    },
    adminPages: [
      {
        key: "my-feature",
        label: "My Feature",
        icon: "AppstoreOutlined",
        path: "/admin/my-feature",
        component: MyAdminPage,
      },
    ],
  };
}
```

### 3. Register in client site

In the client's `site.config.js`:
```js
import { myFeaturePlugin } from "@premast/site-plugin-my-feature";

export const siteConfig = createSiteConfig({
  blocks: baseBlocks,
  categories: baseCategories,
  plugins: [
    myFeaturePlugin({ /* options */ }),
  ],
});
```

---

## Plugin API Reference

### `blocks` — Puck Block Definitions

Each key is the component name used in Puck. The value is a standard Puck component config:

```js
blocks: {
  BannerBlock: {
    label: "Banner",
    fields: {
      text: { type: "text" },
      color: { type: "text" },
    },
    defaultProps: {
      text: "Hello",
      color: "#5e6ad2",
    },
    render: ({ text, color }) => (
      <div style={{ padding: "2rem", background: color, color: "#fff" }}>
        {text}
      </div>
    ),
  },
}
```

### `fields` — Inject Fields into Existing Blocks

Add fields to blocks defined elsewhere (e.g., by site-blocks or other plugins):

```js
fields: {
  HeroBlock: {
    ctaText: { type: "text", label: "CTA Button Text" },
    ctaUrl: { type: "text", label: "CTA Button URL" },
  },
}
```

### `categories` — Puck Editor Categories

Group your blocks in the Puck sidebar:

```js
categories: {
  marketing: {
    title: "Marketing",
    components: ["BannerBlock", "TestimonialBlock"],
    defaultExpanded: true,
  },
}
```

### `adminPages` — Admin Panel Pages

Add pages to the admin sidebar:

```js
adminPages: [
  {
    key: "analytics",               // Unique key
    label: "Analytics",             // Sidebar label
    icon: "BarChartOutlined",       // Ant Design icon name
    path: "/admin/analytics",       // URL path
    component: AnalyticsPage,       // React component
  },
]
```

The component renders automatically via the `[...plugin]` catch-all route. Available icons: any export from `@ant-design/icons`.

### `apiRoutes` — API Route Handlers

Register API endpoints:

```js
apiRoutes: [
  {
    path: "analytics/events",       // Becomes /api/analytics/events
    method: "GET",                  // GET, POST, PATCH, DELETE
    handler: async (request, params, { connectDB, models }) => {
      await connectDB();
      // ... your logic
      return Response.json({ data: [] });
    },
  },
]
```

Handler signature: `(request, params, context) => Response`
- `request`: standard Request object
- `params`: extracted URL params (e.g., `{ id: "abc" }` from `/api/analytics/:id`)
- `context.connectDB`: connects to MongoDB
- `context.models`: all registered Mongoose models
- `context.hooks`: all registered hooks

### `models` — Mongoose Schemas

Register MongoDB models:

```js
import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema({
  event: { type: String, required: true },
  pageId: { type: mongoose.Schema.Types.ObjectId, ref: "Page" },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

// In plugin:
models: {
  AnalyticsEvent: analyticsEventSchema,  // Name → Schema (not Model)
}
```

Models are registered once and available via `mongoose.models.AnalyticsEvent` or `context.models.AnalyticsEvent`.

### `hooks` — Lifecycle Hooks

```js
hooks: {
  // Runs once after MongoDB connects
  afterDbConnect: async () => {
    console.log("Plugin initialized");
  },

  // Runs after a page is saved via the API
  afterPageSave: async (page) => {
    // e.g., rebuild sitemap cache
  },

  // Runs before a page is rendered (can modify data)
  beforePageRender: async (page) => {
    // e.g., inject SEO data
    return page;
  },
}
```

---

## Naming Convention

```
@premast/site-plugin-<name>
```

Examples:
- `@premast/site-plugin-seo`
- `@premast/site-plugin-stripe`
- `@premast/site-plugin-ai`
- `@premast/site-plugin-ui-kit`
- `@premast/site-plugin-analytics`

---

## Testing Your Plugin

1. Add it to the monorepo: `packages/site-plugin-my-feature/`
2. Reference it in a starter/client `site.config.js`
3. Run `pnpm dev` in the client site
4. Check:
   - Blocks appear in the Puck editor
   - Admin pages show in sidebar and render correctly
   - API routes respond at `/api/<path>`
   - Models are queryable via Mongoose
