# Developer Guide

A hands-on guide for junior developers working on Premast client sites. Covers everyday tasks from editing pages to creating custom blocks.

## Table of Contents

- [Understanding the Admin Panel](#understanding-the-admin-panel)
- [Pages vs Content Types vs Content Items](#pages-vs-content-types-vs-content-items)
- [How-To Recipes](#how-to-recipes)
  - [Create a Static Page](#recipe-create-a-static-page)
  - [Create a New Content Type](#recipe-create-a-new-content-type)
  - [Create a New Header Design](#recipe-create-a-new-header-design)
  - [Create a New Footer Design](#recipe-create-a-new-footer-design)
  - [Build a Landing Page](#recipe-build-a-landing-page)
  - [Add a Blog to the Site](#recipe-add-a-blog-to-the-site)
- [Editing Pages with Puck Editor](#editing-pages-with-puck-editor)
- [Creating Custom Puck Blocks](#creating-custom-puck-blocks)
- [Adding a Block to the Editor](#adding-a-block-to-the-editor)
- [Customizing the Theme](#customizing-the-theme)
- [Working with the SEO Plugin](#working-with-the-seo-plugin)
- [API Routes](#api-routes)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Understanding the Admin Panel

After logging in at `/admin`, you'll see the sidebar with:

| Section | What it does |
|---------|-------------|
| **Dashboard** | Overview (home page of admin) |
| **Pages** | Standalone pages (Home, About, Contact, etc.) |
| **Global** | Header and Footer (shared across all pages) |
| **Templates** | Content type definitions (Blog Article, Case Study, etc.) |
| **Content** | Content items grouped by type |
| **Settings** | Site settings |
| **Users** | User management |

---

## Pages vs Content Types vs Content Items

Think of it like this:

- **Page** = a one-off standalone page (Home, About, Contact)
- **Content Type** (Template) = a blueprint for repeatable content (e.g., "Blog Article" template)
- **Content Item** = an individual piece made from a template (e.g., "My First Blog Post")

### Example

```
Templates:
  Blog Article (urlPrefix: /blog)
  Case Study   (urlPrefix: /case-studies)

Content:
  Blog Article:
    "Welcome Post"     → /blog/welcome-post
    "Tips & Tricks"    → /blog/tips-and-tricks
  Case Study:
    "Acme Corp"        → /case-studies/acme-corp

Pages:
  Home                 → /
  About Us             → /about-us
  Contact              → /contact
```

---

## How-To Recipes

Real-world step-by-step workflows for common client requests.

---

### Recipe: Create a Static Page

> **Client says:** "We need an About Us page with our story and team photos."

**Step 1 — Create the page in admin**

1. Go to **Admin → Pages**
2. Click **+ New page**
3. Enter:
   - Title: `About Us`
   - Slug: `about-us` (auto-generated from title)
4. Click Create, then **Edit** to open the Puck editor

**Step 2 — Build the layout**

1. From the **Blocks** panel (left nav), drag blocks onto the canvas:
   - **Hero Block** — for a banner image + headline
   - **Text Block** — for the company story
   - **Columns Block** — for team member cards
   - **Spacer Block** — for spacing between sections
2. Click each block to edit its content in the right panel

**Step 3 — Configure SEO**

1. Scroll to the top of the right panel to find **Root Fields**
2. Fill in:
   - Meta Title: "About Us — Company Name"
   - Meta Description: "Learn about our story, mission, and team."
   - Focus Keyword: "about us"

**Step 4 — Publish**

1. Click **Publish** in the top-right
2. Visit `/about-us` on the live site to verify

---

### Recipe: Create a New Content Type

> **Client says:** "We need a Services section. Each service should have its own page with a description, features list, and pricing."

**Step 1 — Create the content type**

1. Go to **Admin → Templates**
2. Click **+ New template**
3. Fill in:
   - Name: `Service`
   - Slug: `service` (auto-generated)
   - URL Prefix: `/services`
4. Click Create

**Step 2 — Design the template layout**

1. Click **Edit** on the new "Service" template
2. The Puck editor opens with a blank canvas
3. Build the default layout that every service page will start with:
   - **Hero Block** — service name + hero image
   - **Text Block** — service description
   - **Columns Block** — feature highlights (2 or 3 columns)
   - **Text Block** — pricing or CTA section
4. Click **Publish** to save the template

**Step 3 — Create service pages**

1. Go to **Admin → Content → Service** (appears in sidebar automatically)
2. Click **+ New content**
3. Fill in:
   - Title: `Web Design`
   - Slug: `web-design` (auto-generated)
4. Click Create, then **Edit**
5. The Puck editor opens with the template layout pre-filled
6. Customize the content for this specific service
7. Click **Publish**

**Step 4 — Verify**

- Visit `/services/web-design` on the live site
- The page renders with your customized content

**Step 5 — Repeat for each service**

Create more content items: "SEO Optimization" → `/services/seo-optimization`, "Mobile Apps" → `/services/mobile-apps`, etc.

> **Tip:** If you want to list all services on a `/services` page, create a standalone **Page** with slug `services` and add a custom block that fetches and displays all service content items.

---

### Recipe: Create a New Header Design

> **Client says:** "We want a new header with their logo, navigation links, and a CTA button."

**Option A — Using the Puck Editor (no code)**

1. Go to **Admin → Global**
2. Click **Edit** on **Header**
3. The Puck editor opens
4. Build the header using available blocks:
   - Use **Columns Block** for layout (logo left, nav right)
   - Use **Text Block** for the site name
   - Or build with any combination of blocks
5. Click **Publish**
6. Every page on the site now uses this header

**Option B — Custom Code (for complex headers)**

If you need dropdowns, sticky behavior, or interactive elements that blocks can't handle:

1. Edit `components/layout/Header.jsx` in the client project:

```jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./Header.module.css";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <img src="/logo.svg" alt="Company Name" />
        </Link>

        {/* Navigation */}
        <nav className={styles.nav}>
          <Link href="/about">About</Link>
          <Link href="/services">Services</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/contact" className={styles.cta}>
            Contact Us
          </Link>
        </nav>

        {/* Mobile menu toggle */}
        <button
          className={styles.menuToggle}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>
    </header>
  );
}
```

2. Create `components/layout/Header.module.css`:

```css
.header {
  background: var(--theme-surface);
  border-bottom: 1px solid var(--theme-border);
  padding: 0 2rem;
  height: 64px;
  display: flex;
  align-items: center;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.nav a {
  color: var(--theme-text-muted);
  text-decoration: none;
}

.nav a:hover {
  color: var(--theme-text);
}

.cta {
  background: var(--theme-accent);
  color: var(--theme-accent-on-accent);
  padding: 0.5rem 1.25rem;
  border-radius: 4px;
}
```

3. The header renders on every page because `app/(site)/layout.jsx` imports it

> **When to use which?** Use Option A (Puck editor) if the client wants to edit the header themselves without developer help. Use Option B (code) if the header needs complex interactions, animations, or responsive behavior.

---

### Recipe: Create a New Footer Design

> **Client says:** "We need a footer with 4 columns: About, Services, Resources, Contact info."

**Option A — Using the Puck Editor**

Same as the header — go to **Admin → Global → Footer → Edit** and build with blocks.

**Option B — Custom Code**

Edit `components/layout/Footer.jsx`:

```jsx
import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        {/* Column 1 — About */}
        <div>
          <h4 className={styles.heading}>About</h4>
          <p className={styles.text}>
            We build digital products that make a difference.
          </p>
        </div>

        {/* Column 2 — Services */}
        <div>
          <h4 className={styles.heading}>Services</h4>
          <nav className={styles.links}>
            <Link href="/services/web-design">Web Design</Link>
            <Link href="/services/development">Development</Link>
            <Link href="/services/seo">SEO</Link>
          </nav>
        </div>

        {/* Column 3 — Resources */}
        <div>
          <h4 className={styles.heading}>Resources</h4>
          <nav className={styles.links}>
            <Link href="/blog">Blog</Link>
            <Link href="/case-studies">Case Studies</Link>
            <Link href="/faq">FAQ</Link>
          </nav>
        </div>

        {/* Column 4 — Contact */}
        <div>
          <h4 className={styles.heading}>Contact</h4>
          <p className={styles.text}>hello@company.com</p>
          <p className={styles.text}>+1 (555) 123-4567</p>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} Company Name. All rights reserved.</p>
      </div>
    </footer>
  );
}
```

---

### Recipe: Build a Landing Page

> **Client says:** "We need a marketing landing page for our new product launch."

**Step 1 — Create a new page**

1. Go to **Admin → Pages → + New page**
2. Title: `Product Launch`, Slug: `product-launch`

**Step 2 — Build with blocks**

Drag these blocks in order to create a typical landing page:

| Order | Block | Purpose |
|-------|-------|---------|
| 1 | **Hero Block** | Big headline + subtitle + CTA button |
| 2 | **Spacer Block** | Breathing room (40px) |
| 3 | **Columns Block** (3 cols) | Feature highlights with icons |
| 4 | **Spacer Block** | Breathing room (60px) |
| 5 | **Text Block** | Detailed product description |
| 6 | **Columns Block** (2 cols) | Testimonials or social proof |
| 7 | **Spacer Block** | Breathing room (40px) |
| 8 | **Hero Block** | Final CTA section |

**Step 3 — Edit each block**

Click each block and customize its content in the right panel (text, images, colors).

**Step 4 — SEO**

Fill in Root Fields: Meta Title, Description, Focus Keyword.

**Step 5 — Publish & share**

Click Publish. The page is live at `/product-launch`.

> **Need custom blocks?** If the available blocks don't cover the design (e.g., pricing table, FAQ accordion, video embed), create a [custom Puck block](#creating-custom-puck-blocks) first, then use it in the page.

---

### Recipe: Add a Blog to the Site

> **Client says:** "We want a blog section with articles."

**Step 1 — Create the Blog Article content type**

1. **Admin → Templates → + New template**
2. Name: `Blog Article`, Slug: `blog-article`, URL Prefix: `/blog`
3. Click **Edit** and build the template layout:
   - **Hero Block** — article title + featured image
   - **Text Block** — article body content
   - **Spacer Block** — spacing before author info
   - **Text Block** — author bio / call to action
4. Click **Publish**

**Step 2 — Write articles**

1. **Admin → Content → Blog Article → + New content**
2. Title: "How to Get Started", Slug: `how-to-get-started`
3. Edit in Puck, customize the content, Publish
4. Live at: `/blog/how-to-get-started`

**Step 3 — Create a blog listing page (optional)**

If you want a `/blog` page that lists all articles:

1. Create a custom block `BlogListBlock` that fetches articles from the API:

```jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export const BlogListBlock = {
  label: "Blog List",
  fields: {
    limit: { type: "number", label: "Max articles", min: 1, max: 50 },
  },
  defaultProps: { limit: 10 },
  render: ({ limit }) => <BlogList limit={limit} />,
};

function BlogList({ limit }) {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    fetch(`/api/content-items?contentType=blog-article&published=true`)
      .then((r) => r.json())
      .then((json) => setArticles((json.data || []).slice(0, limit)));
  }, [limit]);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {articles.map((article) => (
        <Link key={article._id} href={`/blog/${article.slug}`}>
          <h3>{article.title}</h3>
        </Link>
      ))}
    </div>
  );
}
```

2. Register it in `site.config.js` and `puck.config.js`
3. Create a standalone **Page** with slug `blog` and drop the `BlogListBlock` on it

---

## Editing Pages with Puck Editor

1. Go to **Pages** in the sidebar
2. Click **Edit** on the page you want to change
3. The Puck visual editor opens

### Puck Editor Layout

```
┌─────────┬─────────────────────────┬──────────────┐
│  Nav    │                         │   Fields     │
│         │                         │   Panel      │
│ Blocks  │      Canvas             │              │
│ Outline │      (preview)          │  (edit props │
│         │                         │   of selected│
│         │                         │   block)     │
└─────────┴─────────────────────────┴──────────────┘
```

### How to Add a Block

1. Click **Blocks** in the left nav
2. Drag a block (Heading, Text, Hero, etc.) onto the canvas
3. Click the block on the canvas to select it
4. Edit its properties in the right panel

### How to Save

Click the **Publish** button in the top-right header. This saves the page content to the database.

### Root Fields (Page-Level Settings)

At the top of the right panel, you'll see page-level fields like SEO settings. These apply to the entire page, not a specific block.

---

## Creating Content Types (Templates)

Content types define a reusable page structure.

1. Go to **Templates** in the sidebar
2. Click **+ New template**
3. Fill in:
   - **Name**: e.g., "Blog Article"
   - **Slug**: auto-generated, e.g., "blog-article"
   - **URL Prefix**: e.g., "/blog" (this determines the public URL pattern)
4. Click **Edit** to open the Puck editor
5. Build the default layout for this content type
6. Click **Publish** to save

Now when someone creates a new Blog Article content item, it starts with this template layout.

### URL Prefix Rules

| URL Prefix | Content slug | Public URL |
|-----------|-------------|------------|
| `/blog` | `my-first-post` | `/blog/my-first-post` |
| `/case-studies` | `acme-corp` | `/case-studies/acme-corp` |
| `/products` | `widget-pro` | `/products/widget-pro` |

---

## Creating Content Items

1. Go to **Content** in the sidebar
2. Click on the content type (e.g., "Blog Article")
3. Click **+ New content**
4. Fill in:
   - **Title**: e.g., "My First Blog Post"
   - **Slug**: auto-generated from title
5. Click **Edit** to open the Puck editor
6. Customize the content (the template layout is pre-filled)
7. Click **Publish** to save and make it live

---

## Global Elements (Header & Footer)

These appear on every page of the site.

1. Go to **Global** in the sidebar
2. Click **Edit** on Header or Footer
3. Use the Puck editor to build your header/footer
4. Click **Publish**

If no Global header/footer is published, the site falls back to the default `Header.jsx` and `Footer.jsx` components in `components/layout/`.

---

## Customizing the Theme

### Design Tokens (`theme/tokens.js`)

This file controls the CSS variables used across the site:

```js
export const designTokens = {
  // Background colors
  bg: "#1a1a1a",
  surface: "#232323",

  // Text colors
  text: "#e8e8e8",
  "text-muted": "#999",

  // Brand color
  accent: "#6366f1",

  // Fonts
  "font-sans": '"Inter", system-ui, sans-serif',
};
```

After changing tokens, the site updates automatically (hot reload).

### Where tokens are used

- **CSS files**: `var(--theme-accent)`, `var(--theme-text)`, etc.
- **Puck editor**: themed via `theme/puck.css`
- **Admin panel**: themed via Ant Design (`theme/antd-theme.js`)

### Ant Design Theme (`theme/antd-theme.js`)

Controls the admin panel look (buttons, tables, forms):

```js
export const antdTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: "#6366f1",
    borderRadius: 0,
    fontFamily: '"Inter", sans-serif',
  },
};
```

---

## Creating Custom Puck Blocks

Blocks are the building units of pages. Each block has **fields** (what the editor edits) and a **render function** (what the visitor sees).

### Step 1: Create the Block File

Create `components/puck/TestimonialBlock.jsx`:

```jsx
import styles from "./TestimonialBlock.module.css";

export const TestimonialBlock = {
  // What appears in the Blocks panel
  label: "Testimonial",

  // Editable fields (shown in the right panel)
  fields: {
    quote: { type: "textarea", label: "Quote" },
    author: { type: "text", label: "Author Name" },
    role: { type: "text", label: "Author Role" },
  },

  // Default values when block is first added
  defaultProps: {
    quote: "This product changed our workflow completely.",
    author: "Jane Smith",
    role: "CEO at Acme",
  },

  // What renders on the page
  render: ({ quote, author, role }) => (
    <blockquote className={styles.testimonial}>
      <p className={styles.quote}>"{quote}"</p>
      <footer className={styles.author}>
        <strong>{author}</strong>
        {role && <span> — {role}</span>}
      </footer>
    </blockquote>
  ),
};
```

### Step 2: Add CSS Module

Create `components/puck/TestimonialBlock.module.css`:

```css
.testimonial {
  padding: 2rem;
  border-left: 4px solid var(--theme-accent);
  background: var(--theme-surface);
}

.quote {
  font-size: 1.25rem;
  font-style: italic;
  color: var(--theme-text);
}

.author {
  margin-top: 1rem;
  color: var(--theme-text-muted);
}
```

### Step 3: Register the Block

In `site.config.js`:

```js
import { TestimonialBlock } from "@/components/puck/TestimonialBlock";

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

Also add it to `puck.config.js` (the client-safe version without mongoose).

### Field Types Available

| Type | Description | Example |
|------|-------------|---------|
| `text` | Single line input | Title, name |
| `textarea` | Multi-line input | Description, quote |
| `number` | Numeric input | Spacing, count |
| `select` | Dropdown | Alignment, size |
| `radio` | Radio buttons | Layout options |
| `custom` | Custom React component | Color picker, media upload |

### Select Field Example

```js
fields: {
  alignment: {
    type: "select",
    label: "Alignment",
    options: [
      { label: "Left", value: "left" },
      { label: "Center", value: "center" },
      { label: "Right", value: "right" },
    ],
  },
},
```

---

## Adding a Block to the Editor

After registering a block in `site.config.js`, it appears in the Puck editor's Blocks panel. You can:

1. **Drag it** onto the canvas
2. **Click it** to select and edit its fields
3. **Reorder** by dragging blocks up/down
4. **Delete** by selecting and pressing the delete icon in the action bar

---

## Working with the SEO Plugin

The SEO plugin adds page-level fields to every page in the Puck editor.

### SEO Fields (in Root Fields panel)

| Field | Purpose |
|-------|---------|
| Meta Title | Page title shown in search results |
| Meta Description | Description shown in search results |
| Focus Keyword | Target keyword for SEO scoring |
| OG Image URL | Social media preview image |
| Search Indexing | Index or No Index toggle |

### SEO Score

Below the SEO fields, an SEO score panel shows a real-time analysis based on:
- Title length and keyword usage
- Description length and keyword usage
- Focus keyword presence
- Content length

The score updates as you edit.

---

## API Routes

All API routes are handled by a single catch-all at `app/api/[...route]/route.js`. The available endpoints:

### Pages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pages` | List all pages |
| POST | `/api/pages` | Create a page |
| GET | `/api/pages/:id` | Get a page |
| PATCH | `/api/pages/:id` | Update a page |
| DELETE | `/api/pages/:id` | Delete a page |

### Content Types
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content-types` | List all content types |
| POST | `/api/content-types` | Create a content type |
| GET | `/api/content-types/:id` | Get a content type |
| PATCH | `/api/content-types/:id` | Update a content type |
| DELETE | `/api/content-types/:id` | Delete a content type |

### Content Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content-items` | List all (filter with `?contentType=ID`) |
| POST | `/api/content-items` | Create a content item |
| GET | `/api/content-items/:id` | Get a content item |
| PATCH | `/api/content-items/:id` | Update a content item |
| DELETE | `/api/content-items/:id` | Delete a content item |

### Globals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/globals` | List globals |
| GET | `/api/globals/:key` | Get global (key: "header" or "footer") |
| PATCH | `/api/globals/:key` | Update a global |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/setup` | Create first admin (one-time) |

---

## Common Patterns

### Import Paths

```js
// In client site files — use @/ alias
import { siteConfig } from "@/site.config";
import { designTokens } from "@/theme/tokens";

// From packages — use package name
import { createSiteConfig } from "@premast/site-core";
import { baseBlocks } from "@premast/site-blocks";
```

### "use client" Directive

Add `"use client"` at the top of any file that uses:
- React hooks (`useState`, `useEffect`, etc.)
- Browser APIs (`window`, `document`)
- Ant Design interactive components (`Button`, `Modal`, `Form`)

```jsx
"use client";

import { useState } from "react";
import { Button } from "antd";

export default function MyComponent() {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount(count + 1)}>{count}</Button>;
}
```

### CSS Variables in Styles

Always use CSS variables from the theme, never hardcode colors:

```css
/* ✅ Good */
.card {
  background: var(--theme-surface);
  color: var(--theme-text);
  border: 1px solid var(--theme-border);
}

/* ❌ Bad */
.card {
  background: #232323;
  color: #e8e8e8;
  border: 1px solid #333;
}
```

### Mongoose Model Pattern

Always use the HMR-safe pattern for custom models:

```js
import mongoose from "mongoose";

const mySchema = new mongoose.Schema({
  name: { type: String, required: true },
  // ...
});

export const MyModel =
  mongoose.models.MyModel ?? mongoose.model("MyModel", mySchema);
```

---

## Troubleshooting

### "Module not found: antd" in a plugin

The plugin needs `antd` as a **peer dependency**, not a direct dependency. Check the plugin's `package.json`:

```json
{
  "peerDependencies": {
    "antd": ">=5",
    "react": ">=18"
  }
}
```

### Puck editor fields not themed

Make sure all three editors (Pages, Templates, Content) have:
```jsx
import { puckFieldOverrides } from "@premast/site-core/puck";

<Puck overrides={{ fieldTypes: puckFieldOverrides }} />
```

### CSS variables not working

Check that `ThemeRootVars` is rendered in `app/layout.jsx`:
```jsx
import { ThemeRootVars } from "@/theme/ThemeRootVars";

<ThemeRootVars />
```

### Admin theme looks wrong

Ensure `antd-provider.jsx` wraps the admin layout and uses the correct theme from `theme/antd-theme.js`.

### Content type pages return 404

Check that the content type has a **urlPrefix** set (e.g., `/blog`) and the content item is **published**.

### "Cannot find module" errors during build

Ensure `next.config.mjs` includes all `@premast/*` packages in `transpilePackages`:

```js
transpilePackages: [
  "@premast/site-core",
  "@premast/site-blocks",
  "@premast/site-plugin-seo",
  // add any new plugins here
],
```
