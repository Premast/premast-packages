# Premast CMS — Roadmap

## v1.0 (Current)

### Completed
- Admin panel with dark theme, sidebar navigation, dashboard
- Page management (CRUD, Puck visual editor, publish/draft toggle)
- Content types (templates) with URL prefix routing
- Content items with template inheritance
- Global elements (header/footer) with publish/draft toggle
- User management (CRUD, role-based access, password reset)
- SEO plugin (meta fields, score analyzer, sitemap, robots.txt)
- UI plugin (14 Ant Design blocks: Flex, Grid, Card, Tabs, Accordion, etc.)
- Media plugin (DO Spaces / S3 uploads, `/admin/media` library, `type: "media"` Puck field)
- Multilingual content (i18n plugin: per-locale pages, hreflang, locale-aware admin)
- Plugin-extensible custom Puck field types (`fieldTypes` hook in site-core)
- Auto-slug generation from title
- SEO health dashboard with per-page scoring
- Block search filter in Puck editor
- Custom drawer item cards with icons
- Error boundaries for admin panel
- CLI scaffolding + update tool
- MongoDB connection (mongoose, bufferCommands pattern)
- JWT authentication with HTTP-only cookies

---

## Future Roadmap

### v1.1 — Media & Preview
- [x] **Media upload system** — shipped via `@premast/site-plugin-media` (DO Spaces / S3, admin library, `type: "media"` field)
- [ ] **Page preview** — draft preview before publishing (separate preview URL)
- [ ] **Rich text improvements** — inline image support, table support in BlockNote editor
- [ ] **Image transforms** — on-the-fly resize / format conversion in the media pipeline

### v1.2 — Content Model
- [ ] **Content type custom fields** — define metadata fields per content type (author, date, tags, etc.)
- [ ] **Content relationships** — link content items to each other (related posts, categories)
- [ ] **Slug uniqueness per content type** — allow same slug across different types

### v1.3 — Scale & Performance
- [ ] **Server-side pagination** — paginate pages/content lists (currently loads all records)
- [ ] **Search** — full-text search in pages and content lists
- [ ] **Caching** — ISR or on-demand revalidation instead of force-dynamic
- [ ] **CDN image optimization** — Next.js Image component integration

### v1.4 — Safety & Audit
- [ ] **Soft-delete / trash** — move to trash instead of permanent delete, restore within 30 days
- [ ] **Activity log** — who changed what and when, with diff viewer
- [ ] **Content versioning** — save revision history, rollback to previous versions
- [ ] **Autosave** — periodic draft saving in the Puck editor

### v2.0 — Platform
- [x] **Multi-language (i18n)** — shipped via `@premast/site-plugin-i18n` (content localization, hreflang)
- [ ] **Admin UI translations** — localize the admin panel chrome itself
- [ ] **Dark/light mode toggle** — admin theme switching
- [ ] **Documentation site** — hosted docs with guides, API reference, tutorials
- [ ] **Plugin marketplace** — discover and install community plugins
- [ ] **Multi-site** — single admin managing multiple sites from one dashboard
- [ ] **Webhooks** — notify external services on content changes
- [ ] **API keys** — headless CMS mode with REST API access

---

## Contributing

See [AGENTS.md](../AGENTS.md) for development rules and architecture.
See [docs/creating-plugins.md](creating-plugins.md) for building new plugins.
