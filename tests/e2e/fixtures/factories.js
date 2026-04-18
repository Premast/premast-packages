/**
 * Factories for creating test data via the live HTTP API.
 * Specs should use these instead of writing to Mongo directly — it
 * exercises the same code path as the admin UI and keeps tests
 * decoupled from the DB schema.
 *
 * Each factory takes a Playwright `request` fixture (typically
 * `adminRequest` from fixtures/auth.js) and returns the created doc.
 */

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function emptyPuckContent() {
  return JSON.stringify({ root: { props: {} }, content: [], zones: {} });
}

export async function createPage(request, overrides = {}) {
  const title = overrides.title ?? `Test Page ${Date.now()}`;
  const payload = {
    title,
    slug: overrides.slug ?? slugify(title),
    content: overrides.content ?? emptyPuckContent(),
    published: overrides.published ?? true,
    ...overrides,
  };
  const res = await request.post("/api/pages", { data: payload });
  if (!res.ok()) throw new Error(`createPage failed: ${res.status()} ${await res.text()}`);
  return (await res.json()).data;
}

export async function createContentType(request, overrides = {}) {
  const name = overrides.name ?? "Blog";
  const payload = {
    name,
    slug: overrides.slug ?? slugify(name),
    urlPrefix: overrides.urlPrefix ?? `/${slugify(name)}`,
    templateContent: overrides.templateContent ?? emptyPuckContent(),
    ...overrides,
  };
  const res = await request.post("/api/content-types", { data: payload });
  if (!res.ok()) {
    throw new Error(`createContentType failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).data;
}

export async function createContentItem(request, contentTypeId, overrides = {}) {
  const title = overrides.title ?? `Test Item ${Date.now()}`;
  const payload = {
    title,
    slug: overrides.slug ?? slugify(title),
    contentType: contentTypeId,
    content: overrides.content ?? emptyPuckContent(),
    published: overrides.published ?? true,
    ...overrides,
  };
  const res = await request.post("/api/content-items", { data: payload });
  if (!res.ok()) {
    throw new Error(`createContentItem failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).data;
}

export async function setGlobal(request, key, { content, published = true, locale = "en" } = {}) {
  // The i18n plugin auto-backfills header/footer globals with
  // locale="en" on first DB connect, so we must PATCH the en record
  // by default — otherwise the handler tries to upsert a separate
  // locale=null sibling and hits a 409.
  const payload = { content: content ?? emptyPuckContent(), published, locale };
  const res = await request.patch(`/api/globals/${key}`, { data: payload });
  if (!res.ok()) throw new Error(`setGlobal failed: ${res.status()} ${await res.text()}`);
  return (await res.json()).data;
}

export { slugify, emptyPuckContent };
