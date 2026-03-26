# Creating a New Client Site

Step-by-step guide for the Premast dev team to set up a new client website.

## Step 1: Create the repository

```bash
# Copy the starter template
cp -r /path/to/premast-packages/templates/starter ~/projects/client-name-website
cd ~/projects/client-name-website

# Initialize git
git init
git add -A
git commit -m "Initial commit from Premast starter"
```

## Step 2: Configure packages

If packages are published to GitHub Packages, create `.npmrc`:
```
@premast:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Update `package.json` dependencies to use published versions:
```json
{
  "dependencies": {
    "@premast/site-core": "^0.1.0",
    "@premast/site-blocks": "^0.1.0"
  }
}
```

Then install:
```bash
pnpm install
```

## Step 3: Set up environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with the client's MongoDB connection:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net
MONGODB_DB_NAME=clientname_db
```

## Step 4: Customize branding

### Design tokens (`theme/tokens.js`)

Change colors, fonts to match the client brand:
```js
export const designTokens = {
  bg: "#ffffff",              // Light background
  surface: "#f8f9fa",
  text: "#1a1a1a",
  accent: "#0066cc",          // Client's brand color
  // ... adjust all tokens
};
```

### Ant Design theme (`theme/antd-theme.js`)

Mirror the tokens for the admin panel UI.

## Step 5: Choose plugins

Edit `site.config.js`:
```js
import { createSiteConfig } from "@premast/site-core";
import { baseBlocks, baseCategories } from "@premast/site-blocks";
import { seoPlugin } from "@premast/site-plugin-seo";
// import { stripePlugin } from "@premast/site-plugin-stripe";

export const siteConfig = createSiteConfig({
  blocks: baseBlocks,
  categories: baseCategories,
  plugins: [
    seoPlugin(),
    // stripePlugin({ publishableKey: process.env.STRIPE_KEY }),
  ],
});
```

## Step 6: Add client-specific blocks (optional)

If the client needs custom blocks not in `@premast/site-blocks`:

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
    <blockquote>
      <p>{quote}</p>
      <cite>{author}</cite>
    </blockquote>
  ),
};
```

Add to `site.config.js`:
```js
import { TestimonialBlock } from "@/components/puck/ClientBlocks";

export const siteConfig = createSiteConfig({
  blocks: {
    ...baseBlocks,
    TestimonialBlock,
  },
  categories: {
    ...baseCategories,
    custom: {
      title: "Custom",
      components: ["TestimonialBlock"],
    },
  },
  plugins: [seoPlugin()],
});
```

## Step 7: Deploy

Deploy as a standard Next.js application:

```bash
pnpm build
pnpm start
```

Works with Vercel, Railway, Docker, or any Node.js host.

Set the same env vars (`MONGODB_URI`, `MONGODB_DB_NAME`) in your hosting platform.

## Step 8: Ongoing updates

When the core packages are updated:
```bash
pnpm update @premast/site-core @premast/site-blocks
```

Test locally, then deploy. That's it — all client sites get the same fix.

---

## Checklist for New Client

- [ ] Copy starter template
- [ ] Set up git repo
- [ ] Configure MongoDB connection
- [ ] Customize design tokens (colors, fonts)
- [ ] Update Ant Design theme
- [ ] Choose and install plugins
- [ ] Add client-specific Puck blocks (if needed)
- [ ] Create initial pages in admin
- [ ] Configure deployment
- [ ] Set environment variables in hosting
