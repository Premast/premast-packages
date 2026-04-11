# @premast/site-plugin-i18n

Multi-language support for Premast sites — adds locale routing, per-locale
page documents, an admin translations view, and RTL-ready primitives.

## Install

```sh
pnpm add @premast/site-plugin-i18n
```

## Wire it up

```js
// site.config.js
import { createSiteConfig } from "@premast/site-core";
import { i18nPlugin } from "@premast/site-plugin-i18n";
import { i18nPluginServer } from "@premast/site-plugin-i18n/server";
import { baseBlocks, baseCategories } from "@/components/blocks";

const i18n = i18nPlugin({
  locales: ["en", "ar", "fr"],
  defaultLocale: "en",
  fallbackStrategy: "default-locale",
});

export const siteConfig = createSiteConfig({
  blocks: baseBlocks,
  categories: baseCategories,
  plugins: [
    { ...i18n, ...i18nPluginServer(i18n.config) },
  ],
});
```

```js
// puck.config.js (client-safe)
import { i18nPlugin } from "@premast/site-plugin-i18n";
// editor-only helpers:
import { LocaleSwitcher } from "@premast/site-plugin-i18n/editor";
```

## Storage model

One Page document per `(slug, locale)` pair, linked by a shared
`translationGroupId`. Blocks never see locale data — their `render`
functions stay unchanged.

| Field | Type | Notes |
|---|---|---|
| `locale` | string | e.g. `"en"`, `"ar"` — set by the root field |
| `translationGroupId` | string (uuid) | shared across all locale siblings |

The plugin's `beforePageSave` hook ensures every page has both fields
populated. When creating a locale sibling via the API, the group id is
preserved so the two documents are linked.

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/i18n/duplicate` | POST | Create a locale sibling of an existing page |
| `/api/i18n/group/:id` | GET | List all pages in a translation group |
| `/api/i18n/locales` | GET | List configured locales |

### Duplicate example

```sh
curl -X POST /api/i18n/duplicate \
  -H "Content-Type: application/json" \
  -d '{"sourceId":"...","targetLocale":"ar","newSlug":"عن"}'
```

The new page starts as `published: false`.

## Next.js routing

Recommended setup uses `next-intl` with a `[locale]` dynamic segment:

```
app/
  [locale]/
    layout.jsx
    [...slug]/page.jsx
  middleware.js
```

```jsx
// app/[locale]/layout.jsx
import { getLocaleDir } from "@premast/site-plugin-i18n/config";

export default function LocaleLayout({ children, params: { locale } }) {
  const dir = getLocaleDir(locale);
  return (
    <html lang={locale} dir={dir}>
      <body>{children}</body>
    </html>
  );
}
```

## RTL

Locales marked RTL in `DEFAULT_LOCALE_META` (Arabic, Hebrew, Persian,
Urdu) automatically get `dir="rtl"` when you use `getLocaleDir()` in the
root layout. Pair with Ant Design's `ConfigProvider direction={dir}` to
flip components. In your own CSS, prefer logical properties
(`padding-inline-start`, `margin-inline-end`) so blocks flip without
`[dir="rtl"]` overrides.

## UI strings (vs. content)

This plugin handles **page content** (blocks, text, SEO) via per-locale
documents. For **UI chrome** ("Read more", "Add to cart", etc.) use
`next-intl`'s message files alongside this plugin:

```
messages/
  en.json
  ar.json
```

The optional `UiMessage` mongoose model is shipped for teams that want
to manage UI strings through the admin rather than in code. It is not
required.

## Fallback strategy

When a visitor requests a locale that doesn't exist for a given slug:

- `"default-locale"` (default) — serve the default-locale version and
  render `<html lang="en">` honestly. Optionally show a banner.
- `"404"` — strict mode, return not found.
- `"nearest"` — reserved for future language-family matching.

## Plugin options

| Option | Type | Default | Description |
|---|---|---|---|
| `locales` | `string[]` | `["en"]` | Supported locale codes |
| `defaultLocale` | `string` | `"en"` | Fallback locale |
| `localeMeta` | `object` | `{}` | Override `{ label, nativeLabel, dir }` per code |
| `fallbackStrategy` | `string` | `"default-locale"` | `"default-locale"` \| `"404"` \| `"nearest"` |
| `showFallbackNotice` | `boolean` | `true` | Show banner on fallback render |
