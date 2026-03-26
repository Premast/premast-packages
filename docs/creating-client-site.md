# Creating a New Client Site

## Using the CLI (recommended)

```bash
npx create-premast-site
```

The wizard asks for:
1. **Project name** — used as folder name, package name, and DB name
2. **Plugins** — select which `@premast/site-plugin-*` packages to include

Then it automatically:
- Scaffolds the project from the starter template
- Configures `package.json` with selected plugins
- Generates `site.config.js` with plugin imports
- Generates `next.config.mjs` with `transpilePackages`
- Creates `.env.local` with project-specific DB name
- Installs dependencies
- Initializes git with first commit

### Prerequisites

Before running the CLI, your machine needs:

1. **GitHub Packages access** — create `~/.npmrc`:
   ```
   @premast:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
   ```
   The token needs `read:packages` scope.

2. **Node.js 18+** and **pnpm** (or npm/yarn)

3. **MongoDB** running locally or a MongoDB Atlas connection string

### After scaffolding

```bash
cd my-client-site

# Edit MongoDB connection:
nano .env.local

# Start dev server:
pnpm dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin

---

## Manual Setup (alternative)

If you prefer to set up manually instead of using the CLI:

### 1. Copy the starter template

```bash
cp -r /path/to/premast-packages/templates/starter ~/projects/client-name-website
cd ~/projects/client-name-website
```

### 2. Configure .npmrc

```
@premast:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

### 3. Update package.json

Change the name and replace `workspace:*` with published versions:
```json
{
  "name": "client-name-website",
  "dependencies": {
    "@premast/site-core": "^0.1.0",
    "@premast/site-blocks": "^0.1.0"
  }
}
```

### 4. Install and run

```bash
pnpm install
cp .env.local.example .env.local
# Edit .env.local with your MongoDB URI
pnpm dev
```

---

## Customization After Setup

### Design tokens (`theme/tokens.js`)

Change colors, fonts to match the client brand:
```js
export const designTokens = {
  bg: "#ffffff",
  surface: "#f8f9fa",
  text: "#1a1a1a",
  accent: "#0066cc",        // Client's brand color
  // ...
};
```

### Admin theme (`site.config.js`)

Override admin panel colors:
```js
export const siteConfig = createSiteConfig({
  blocks: baseBlocks,
  categories: baseCategories,
  plugins: [seoPlugin()],
  admin: {
    title: "Client Name CMS",
    theme: {
      accent: "#10b981",     // Green accent for admin
      bg: "#0f172a",         // Slate background
    },
  },
});
```

### Add client-specific Puck blocks

Create `components/puck/ClientBlocks.jsx`:
```jsx
export const TestimonialBlock = {
  label: "Testimonial",
  fields: {
    quote: { type: "textarea" },
    author: { type: "text" },
  },
  defaultProps: { quote: "Great service!", author: "Client" },
  render: ({ quote, author }) => (
    <blockquote><p>{quote}</p><cite>{author}</cite></blockquote>
  ),
};
```

Add to `site.config.js`:
```js
import { TestimonialBlock } from "@/components/puck/ClientBlocks";

export const siteConfig = createSiteConfig({
  blocks: { ...baseBlocks, TestimonialBlock },
  categories: {
    ...baseCategories,
    custom: { title: "Custom", components: ["TestimonialBlock"] },
  },
  plugins: [seoPlugin()],
});
```

### Add or remove plugins

```bash
# Add a plugin
pnpm add @premast/site-plugin-stripe

# Remove a plugin
pnpm remove @premast/site-plugin-seo
```

Then update `site.config.js` imports accordingly.

---

## Deployment

Deploy as a standard Next.js application:

```bash
pnpm build
pnpm start
```

Works with **Vercel**, **Railway**, **Docker**, or any Node.js host.

Set these environment variables in your hosting platform:
- `MONGODB_URI` — MongoDB connection string
- `MONGODB_DB_NAME` — database name
- `GITHUB_TOKEN` — needed for npm install from GitHub Packages during build

### Vercel-specific

In Vercel project settings:
1. **Build Command**: `pnpm build`
2. **Install Command**: `pnpm install`
3. **Environment Variables**: Add `MONGODB_URI`, `MONGODB_DB_NAME`, `GITHUB_TOKEN`

---

## Updating Packages

When the core packages are updated:

```bash
pnpm update @premast/site-core @premast/site-blocks
```

Test locally, then deploy.

---

## Checklist

- [ ] Run `npx create-premast-site` (or copy starter manually)
- [ ] Configure `.env.local` with MongoDB URI
- [ ] Customize `theme/tokens.js` (colors, fonts)
- [ ] Update `site.config.js` admin title
- [ ] Add client-specific Puck blocks (if needed)
- [ ] Test locally with `pnpm dev`
- [ ] Deploy to hosting platform
- [ ] Set environment variables in hosting
