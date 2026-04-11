import { buildLocaleSibling } from "../hooks/i18n-hooks.js";

/**
 * API handlers for the i18n plugin.
 *
 * All handlers follow site-core's signature:
 *   async (request, params, context) => Response
 * where context = { connectDB, models, hooks }.
 *
 * Important: handlers must NEVER `import("mongoose")` directly. The
 * plugin's node_modules is unpredictable from the consuming site's
 * webpack root, and dynamic mongoose imports get bundled as missing
 * modules. Always grab models from `context.models`, which site-core
 * resolves through the consuming site's mongoose instance.
 */

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

function getPageModel(models) {
  const Page = models?.Page;
  if (!Page) {
    return null;
  }
  return Page;
}

/**
 * POST /api/i18n/duplicate
 * Body: { sourceId: string, targetLocale: string, newSlug?: string }
 *
 * Creates a locale-sibling of an existing Page. Both documents share
 * the same translationGroupId.
 */
export async function duplicateToLocaleHandler(request, _params, { connectDB, models }) {
  await connectDB();
  const Page = getPageModel(models);
  if (!Page) return json({ error: "Page model not registered" }, { status: 500 });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sourceId, targetLocale, newSlug } = body ?? {};
  if (!sourceId || !targetLocale) {
    return json(
      { error: "sourceId and targetLocale are required" },
      { status: 400 },
    );
  }

  const source = await Page.findById(sourceId);
  if (!source) {
    return json({ error: "Source page not found" }, { status: 404 });
  }

  // If the source has no translationGroupId yet (legacy page), assign
  // one and persist it so future duplicates link to the same group.
  if (!source.translationGroupId) {
    source.translationGroupId = (await import("node:crypto")).randomUUID();
    await source.save();
  }

  // Prevent duplicate (slug, locale) collisions — the slug can be
  // reused across locales, but not within the same locale.
  const siblingData = buildLocaleSibling(source, targetLocale);
  if (newSlug) siblingData.slug = newSlug;

  const existing = await Page.findOne({
    slug: siblingData.slug,
    locale: targetLocale,
  });
  if (existing) {
    return json(
      { error: `A page with slug "${siblingData.slug}" already exists for locale "${targetLocale}"` },
      { status: 409 },
    );
  }

  const created = await Page.create(siblingData);
  return json({ page: created.toObject() }, { status: 201 });
}

/**
 * GET /api/i18n/group/:id
 * Returns all pages that belong to the same translationGroupId.
 */
export async function getTranslationGroupHandler(_request, params, { connectDB, models }) {
  await connectDB();
  const Page = getPageModel(models);
  if (!Page) return json({ error: "Page model not registered" }, { status: 500 });

  const groupId = params?.id;
  if (!groupId) return json({ error: "group id is required" }, { status: 400 });

  const pages = await Page.find({ translationGroupId: groupId })
    .select("title slug locale published updatedAt")
    .lean();

  return json({ groupId, pages });
}

/* ----------------------------- Globals ----------------------------- */

function getGlobalModel(models) {
  return models?.Global ?? null;
}

/**
 * POST /api/i18n/duplicate-global
 * Body: { sourceId?: string, key?: string, sourceLocale?: string|null, targetLocale: string }
 *
 * Creates a locale-sibling of an existing Global (header/footer).
 * The source can be identified either by `sourceId` or by
 * `(key, sourceLocale)`. Both siblings share the same translationGroupId.
 */
export async function duplicateGlobalToLocaleHandler(request, _params, { connectDB, models }) {
  await connectDB();
  const Global = getGlobalModel(models);
  if (!Global) return json({ error: "Global model not registered" }, { status: 500 });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sourceId, key, sourceLocale, targetLocale } = body ?? {};
  if (!targetLocale) {
    return json({ error: "targetLocale is required" }, { status: 400 });
  }
  if (!sourceId && !key) {
    return json({ error: "Either sourceId or key is required" }, { status: 400 });
  }

  const source = sourceId
    ? await Global.findById(sourceId)
    : await Global.findOne({ key, locale: sourceLocale ?? null });

  if (!source) {
    return json({ error: "Source global not found" }, { status: 404 });
  }

  // Legacy globals (created before the i18n plugin) may lack a
  // translationGroupId. Assign one and persist it before duplicating
  // so the sibling links to the same group.
  if (!source.translationGroupId) {
    source.translationGroupId = (await import("node:crypto")).randomUUID();
    await source.save();
  }

  const existing = await Global.findOne({ key: source.key, locale: targetLocale });
  if (existing) {
    return json(
      { error: `Global "${source.key}" already exists for locale "${targetLocale}"` },
      { status: 409 },
    );
  }

  const base = source.toObject();
  delete base._id;
  delete base.createdAt;
  delete base.updatedAt;
  delete base.__v;

  const created = await Global.create({
    ...base,
    locale: targetLocale,
    translationGroupId: source.translationGroupId,
    published: false,
  });

  return json({ global: created.toObject() }, { status: 201 });
}

/**
 * GET /api/i18n/group-global/:id
 * Returns all globals that belong to the same translationGroupId.
 */
export async function getGlobalTranslationGroupHandler(_request, params, { connectDB, models }) {
  await connectDB();
  const Global = getGlobalModel(models);
  if (!Global) return json({ error: "Global model not registered" }, { status: 500 });

  const groupId = params?.id;
  if (!groupId) return json({ error: "group id is required" }, { status: 400 });

  const globals = await Global.find({ translationGroupId: groupId })
    .select("key locale published updatedAt")
    .lean();

  return json({ groupId, globals });
}

/* ---------------------------- ContentItems ---------------------------- */

function getContentItemModel(models) {
  return models?.ContentItem ?? null;
}

/**
 * POST /api/i18n/duplicate-content-item
 * Body: { sourceId: string, targetLocale: string, newSlug?: string }
 *
 * Creates a locale-sibling of an existing ContentItem. Both share the
 * same translationGroupId so the public route can resolve them as a
 * pair via the locale fallback chain.
 */
export async function duplicateContentItemToLocaleHandler(request, _params, { connectDB, models }) {
  await connectDB();
  const ContentItem = getContentItemModel(models);
  if (!ContentItem) return json({ error: "ContentItem model not registered" }, { status: 500 });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sourceId, targetLocale, newSlug } = body ?? {};
  if (!sourceId || !targetLocale) {
    return json({ error: "sourceId and targetLocale are required" }, { status: 400 });
  }

  const source = await ContentItem.findById(sourceId);
  if (!source) {
    return json({ error: "Source content item not found" }, { status: 404 });
  }

  // Legacy items (created before the i18n plugin) may lack a
  // translationGroupId. Assign one and persist it before duplicating
  // so the sibling links to the same group.
  if (!source.translationGroupId) {
    source.translationGroupId = (await import("node:crypto")).randomUUID();
    await source.save();
  }

  const siblingData = buildLocaleSibling(source, targetLocale);
  if (newSlug) siblingData.slug = newSlug;
  // Preserve the contentType reference — buildLocaleSibling clones the
  // raw object so it survives, but we re-assert it here in case the
  // source object was lean()-style.
  siblingData.contentType = source.contentType;

  const existing = await ContentItem.findOne({
    contentType: source.contentType,
    slug: siblingData.slug,
    locale: targetLocale,
  });
  if (existing) {
    return json(
      { error: `A content item with slug "${siblingData.slug}" already exists for locale "${targetLocale}"` },
      { status: 409 },
    );
  }

  const created = await ContentItem.create(siblingData);
  return json({ contentItem: created.toObject() }, { status: 201 });
}

/**
 * GET /api/i18n/group-content-item/:id
 * Returns all ContentItems that belong to the same translationGroupId.
 */
export async function getContentItemTranslationGroupHandler(_request, params, { connectDB, models }) {
  await connectDB();
  const ContentItem = getContentItemModel(models);
  if (!ContentItem) return json({ error: "ContentItem model not registered" }, { status: 500 });

  const groupId = params?.id;
  if (!groupId) return json({ error: "group id is required" }, { status: 400 });

  const items = await ContentItem.find({ translationGroupId: groupId })
    .select("title slug contentType locale published updatedAt")
    .populate("contentType", "name slug urlPrefix")
    .lean();

  return json({ groupId, contentItems: items });
}
