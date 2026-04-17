/**
 * Built-in core hook that auto-creates a Redirect when an editor
 * renames a Page's or ContentItem's slug. Registered in
 * `collectHooks()` in config.js so every site gets the behavior
 * with no opt-in.
 *
 * Hook contract:
 *   - Runs only when `action === "update"` and the slug actually changed.
 *   - Resolves the OLD path (from oldDoc) and NEW path (from newDoc).
 *     For Pages this is "/" + slug. For ContentItems this is
 *     ContentType.urlPrefix + "/" + slug — the parent ContentType is
 *     pre-loaded in the API handler and passed in.
 *   - Rewrites any existing redirects whose toPath === fromPath so
 *     they jump straight to the new path (no chains).
 *   - Upserts a `source: "auto-slug-change"` 301 from old → new.
 *   - Wraps everything in try/catch; failures are logged but never
 *     bubble up — the page save itself must succeed even if redirect
 *     bookkeeping fails.
 */

export function pathForPage(page) {
  if (!page?.slug) return null;
  return "/" + page.slug;
}

export function pathForContentItem(item, contentType) {
  if (!item?.slug || !contentType?.urlPrefix) return null;
  // urlPrefix already starts with "/", e.g. "/blog"
  const prefix = contentType.urlPrefix.replace(/\/$/, "");
  return `${prefix}/${item.slug}`;
}

async function applyRedirect(Redirect, fromPath, toPath, locale) {
  if (!fromPath || !toPath || fromPath === toPath) return;

  // Step 1 — rewrite chains. Any redirect previously pointing AT the
  // old path now points at the new path directly. Scoped by locale to
  // avoid cross-locale rewriting.
  await Redirect.updateMany(
    { toPath: fromPath, locale: locale ?? null },
    { $set: { toPath } },
  );

  // Step 2 — upsert the from→to redirect. If a record already exists
  // for this fromPath (e.g. a manual one), update it so the editor's
  // most recent rename wins. Locale is part of the unique index.
  await Redirect.findOneAndUpdate(
    { fromPath, locale: locale ?? null },
    {
      $set: {
        toPath,
        statusCode: 301,
        source: "auto-slug-change",
      },
      $setOnInsert: { hits: 0, lastHitAt: null },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function autoRedirectAfterPageSave({ page, action, oldDoc, models }) {
  try {
    if (action !== "update") return;
    if (!oldDoc || !page) return;
    if (oldDoc.slug === page.slug) return;
    if (!models?.Redirect) return;

    const fromPath = pathForPage(oldDoc);
    const toPath = pathForPage(page);
    await applyRedirect(models.Redirect, fromPath, toPath, page.locale ?? oldDoc.locale ?? null);
  } catch (err) {
    console.error("[premast] auto-redirect (page) failed:", err);
  }
}

export async function autoRedirectAfterContentItemSave({
  contentItem,
  action,
  oldDoc,
  contentType,
  models,
}) {
  try {
    if (action !== "update") return;
    if (!oldDoc || !contentItem) return;
    if (oldDoc.slug === contentItem.slug) return;
    if (!contentType) return;
    if (!models?.Redirect) return;

    const fromPath = pathForContentItem(oldDoc, contentType);
    const toPath = pathForContentItem(contentItem, contentType);
    await applyRedirect(
      models.Redirect,
      fromPath,
      toPath,
      contentItem.locale ?? oldDoc.locale ?? null,
    );
  } catch (err) {
    console.error("[premast] auto-redirect (content item) failed:", err);
  }
}
