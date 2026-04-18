# @premast/site-plugin-media

Media library for Premast sites — direct-to-bucket uploads (DigitalOcean
Spaces / any S3-compatible store), a `/admin/media` admin page, and a
`type: "media"` Puck field that drops into any block that used to take a
plain URL string.

## Install

```sh
pnpm add @premast/site-plugin-media
# or use the CLI, which also wires site.config.js / puck.config.js / next.config.mjs
pnpm --dir <your-site> run add-plugin
```

## Wire it up

```js
// site.config.js
import { createSiteConfig } from "@premast/site-core";
import { mediaPlugin } from "@premast/site-plugin-media";
import { baseBlocks, baseCategories } from "@/components/blocks";

export const siteConfig = createSiteConfig({
  blocks: baseBlocks,
  categories: baseCategories,
  plugins: [mediaPlugin()],
  serverPlugins: async () => {
    const { mediaPluginServer } = await import("@premast/site-plugin-media/server");
    return [{ name: "media", ...mediaPluginServer }];
  },
});
```

```js
// puck.config.js (client-safe)
// No extra imports needed — site-core auto-collects `fieldTypes` from
// every plugin in the `plugins` array.
import { mediaPlugin } from "@premast/site-plugin-media";
```

## Environment

DigitalOcean Spaces is the default. Any S3-compatible bucket works.

```bash
DO_SPACES_ENDPOINT=https://fra1.digitaloceanspaces.com
DO_SPACES_REGION=fra1
DO_SPACES_BUCKET=your-bucket-name
DO_SPACES_KEY=...
DO_SPACES_SECRET=...

# Optional
DO_SPACES_CDN_URL=https://cdn.example.com   # serve URLs from a CDN
DO_SPACES_PREFIX=uploads/                    # key prefix inside the bucket
```

Bucket policy: uploads are signed with `x-amz-acl: public-read`, so the
bucket must allow that ACL and public GET on the resulting objects. If
you prefer private objects + signed read URLs, swap the storage adapter
and drop the ACL header in `src/client/upload.js`.

## Usage in blocks

Engineers replace plain URL text inputs with the picker. **The stored
value stays a URL string**, so existing published pages render unchanged.

```js
// before
logoSrc: { type: "text", label: "Logo image path" },

// after — same stored value, better editor UX
logoSrc: { type: "media", label: "Logo image" },
```

Works in top-level fields, `arrayFields`, and `objectFields`.

### `@premast/site-plugin-ui` integration

The UI plugin's `ImageBlock.src` and `CarouselBlock.slides[].imageUrl`
both declare `type: "media"` natively. When the media plugin is
installed, those fields render the picker. When it isn't, site-core's
walker falls back to a plain text input (with a one-time console
warning), so the UI plugin does not hard-depend on the media plugin —
both can be installed independently.

This is the general contract for any plugin that wants to use
`type: "media"`: declare it directly, and let the consuming site opt
into the richer UX by installing `@premast/site-plugin-media`.

## How uploads work

Two-step presigned upload — bytes never touch the Next.js server:

1. Browser calls `POST /api/media/presign` → gets a signed PUT URL.
2. Browser `PUT`s the file bytes directly to Spaces.
3. Browser calls `POST /api/media` to record metadata
   (`key`, `url`, `filename`, `mime`, `size`, `width`, `height`).

Helper: `import { uploadMediaFile } from "@premast/site-plugin-media/editor"`.

## API routes

All routes are guarded by `requireAuth({ roles: ["super_admin", "editor"] })`.

| Route | Method | Purpose |
|---|---|---|
| `/api/media/presign` | POST | Return a presigned PUT URL + public URL |
| `/api/media` | POST | Record `MediaFile` metadata after a direct upload |
| `/api/media` | GET | List uploads (`?limit`, `?before`, `?q=filename`) |
| `/api/media/:id` | GET | Fetch one record |
| `/api/media/:id` | DELETE | Delete the Spaces object + DB row |

Delete is tolerant: if the remote object is already gone (or the
Spaces creds are wrong), the error is logged and the DB row is still
removed — so the admin library never shows orphaned rows.

## Model

```ts
MediaFile {
  key:        string   // object key inside the bucket
  url:        string   // public URL clients embed in pages
  filename:   string
  mime:       string
  size:       number   // bytes
  width?:     number
  height?:    number
  alt:        string
  uploadedBy: ObjectId // User ref
  createdAt:  Date
  updatedAt:  Date
}
```

## Admin page

`/admin/media` — upload dropzone, searchable grid, preview modal,
copy-URL, delete. Registered automatically via `adminPages`.

## Backward compatibility

- Installing the plugin is purely additive: a new `mediafiles`
  collection plus new routes and an admin entry. No changes to `Page` /
  `ContentItem` schemas.
- Stored field values are plain URL strings, identical in shape to
  what a `{ type: "text" }` field would store. Flipping a field's type
  from `text` → `media` does not invalidate existing Puck content.
- Uninstalling is safe: published pages keep rendering because the
  URLs are real HTTP URLs on your bucket, unrelated to plugin state.

## E2E coverage

[`tests/e2e/specs/plugins/media.spec.js`](../../tests/e2e/specs/plugins/media.spec.js)
covers routing, auth, DB CRUD, and an optional live-bucket round-trip
(auto-skipped when `DO_SPACES_*` aren't set).
