# Premast CMS — Roadmap

## v0.1.0 — Foundation (✅ Released)

- [x] Monorepo setup (pnpm workspaces)
- [x] `@premast/site-core` — DB models, API handlers, config system
- [x] `@premast/site-blocks` — Base Puck blocks (Heading, Text, Image, Spacer, Columns, Hero)
- [x] `@premast/site-plugin-seo` — SEO root fields, score analyzer
- [x] Page, ContentType, ContentItem, Global models
- [x] Admin dashboard with Ant Design dark theme
- [x] Puck visual editor integration
- [x] Plugin system (blocks, fields, admin pages, API routes, models, hooks)
- [x] `create-premast-site` CLI scaffolding tool

## v0.2.0 — Auth & Public Routes (✅ Current)

- [x] Authentication system (NextAuth-style JWT, login/setup pages)
- [x] Auth middleware protecting admin routes
- [x] CLI super-admin setup step
- [x] User model (super_admin, editor roles)
- [x] Dynamic admin sidebar (content types as sub-items)
- [x] Puck Ant Design field overrides (all editors)
- [x] Puck condensed UI CSS
- [x] Generic `[...path]` catch-all for public content item routes
- [x] Standalone Page rendering at `/<slug>`
- [x] Auto-slug generation from title

## v0.3.0 — Media & Image Upload

- [ ] Image upload API endpoint (multipart/form-data)
- [ ] Cloudinary integration (upload, transform, CDN)
- [ ] Custom Puck image picker field (browse/upload from media library)
- [ ] Media library admin page (browse, search, delete uploads)
- [ ] Image block enhancement (use media library picker)

## v0.4.0 — Publishing & Preview

- [ ] Draft/published workflow with preview mode
- [ ] Content scheduling (publish at date/time)
- [ ] Content versioning (revision history)
- [ ] Preview API route (`/api/preview/[type]/[slug]`)
- [ ] "Preview" button in Puck editor header

## v0.5.0 — User Management & Permissions

- [ ] User management admin page (invite, edit, deactivate)
- [ ] Role-based access control (super_admin, admin, editor, viewer)
- [ ] Per-content-type permissions (who can edit what)
- [ ] Audit log (who changed what, when)
- [ ] Password reset flow (email-based)

## v0.6.0 — Forms Plugin

- [ ] `@premast/site-plugin-forms` — form builder
- [ ] Drag-and-drop form field editor
- [ ] Form submissions storage and admin view
- [ ] Email notifications on submission
- [ ] Spam protection (honeypot, rate limiting)

## v0.7.0 — Performance & Developer Experience

- [ ] Static site generation (SSG) support for content pages
- [ ] Incremental static regeneration (ISR) with on-demand revalidation
- [ ] API response caching (Redis or in-memory)
- [ ] Bundle size optimization (tree-shaking, dynamic imports)
- [ ] Developer docs site (usage guides, plugin authoring)

## v1.0.0 — Production Release

- [ ] Security audit (CSRF, XSS, injection protection)
- [ ] Rate limiting on all API endpoints
- [ ] Error monitoring integration (Sentry or similar)
- [ ] Automated tests (unit + integration)
- [ ] npm publish workflow (Changesets + CI)
- [ ] Production deployment guide (Vercel, Docker, self-hosted)
- [ ] Starter template updated with all v0.x features
- [ ] Public documentation site

## Future Ideas (Post v1.0)

- [ ] `@premast/site-plugin-analytics` — tracking dashboard
- [ ] `@premast/site-plugin-stripe` — payments/subscriptions
- [ ] `@premast/site-plugin-i18n` — multi-language support
- [ ] `@premast/site-plugin-search` — full-text search (Algolia/Meilisearch)
- [ ] `@premast/site-plugin-comments` — comment system
- [ ] AI content assistant (generate text, alt-text, meta descriptions)
- [ ] Visual theme editor (live token editing in admin)
- [ ] Marketplace for community plugins
