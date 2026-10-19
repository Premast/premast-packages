import { runBeforePageSave, runBeforeContentItemSave } from "./hooks.js";

/**
 * The save path for Pages and ContentItems:
 *
 *   beforeXSave hooks (e.g. i18n fills locale/translationGroupId)
 *     → write
 *     → afterXSave hooks (e.g. core auto-redirect when a slug changes)
 *
 * The admin API handlers and @premast/site-plugin-mcp's write tools
 * both save through here, so a page an agent saves runs the same hooks
 * as an editor's save.
 *
 * `hooks` is the site's hook map (siteConfig.getHooks(), or `hooks` on
 * an API route's context). `models` is the registered model map the
 * after hooks read (Redirect, ContentType). Hook errors are logged and
 * never abort the save; errors from the write itself propagate, so a
 * duplicate slug reaches the caller as E11000 (`err.code === 11000`).
 */

export async function createPage(data, { hooks } = {}) {
  const { Page } = (await import("../db/models/Page.js"));
  // Let beforePageSave hooks (e.g. i18n) mutate the initial doc —
  // typically to fill in locale/translationGroupId.
  const doc = await runBeforePageSave(hooks, data, "create");

  const page = await Page.create(doc);
  // Run afterPageSave hooks
  if (hooks?.afterPageSave) {
    for (const { fn } of hooks.afterPageSave) {
      try { await fn({ page: page.toObject(), action: "create" }); } catch (e) {
        console.error("[premast] afterPageSave hook error:", e);
      }
    }
  }
  return page;
}

/** Returns the updated page, or null when no page has this id. */
export async function updatePage(id, update, { hooks, models } = {}) {
  const { Page } = (await import("../db/models/Page.js"));
  // Snapshot the current document BEFORE the update so afterPageSave
  // hooks (e.g. core auto-redirect) can compare oldDoc.slug vs the
  // new value. Also passed to beforePageSave for symmetry.
  const oldDoc = await Page.findById(id).lean();

  // Allow beforePageSave hooks to enrich the update (e.g. fill locale).
  const enriched = await runBeforePageSave(hooks, update, "update", oldDoc);

  const page = await Page.findByIdAndUpdate(
    id, { $set: enriched }, { returnDocument: "after", runValidators: true },
  ).lean();
  if (!page) return null;
  // Run afterPageSave hooks
  if (hooks?.afterPageSave) {
    for (const { fn } of hooks.afterPageSave) {
      try { await fn({ page, action: "update", oldDoc, models }); } catch (e) {
        console.error("[premast] afterPageSave hook error:", e);
      }
    }
  }
  return page;
}

export async function createContentItem(data, { hooks, models } = {}) {
  const { ContentItem } = (await import("../db/models/ContentItem.js"));
  const { contentType } = data;
  // Let beforeContentItemSave hooks (e.g. i18n) fill in
  // locale/translationGroupId.
  const doc = await runBeforeContentItemSave(hooks, data, "create", contentType);

  const created = await ContentItem.create(doc);
  // Run afterContentItemSave hooks. The auto-redirect hook only
  // acts on update, so create is effectively a no-op for it — but
  // we wire the invocation here so other plugins can react to new
  // content. Pre-load the parent ContentType (needed for path
  // resolution by the redirect hook).
  if (hooks?.afterContentItemSave?.length) {
    const ContentTypeModel = models?.ContentType;
    const ct = ContentTypeModel
      ? await ContentTypeModel.findById(contentType).lean()
      : null;
    const item = created.toObject ? created.toObject() : created;
    for (const { fn } of hooks.afterContentItemSave) {
      try {
        await fn({ contentItem: item, action: "create", oldDoc: null, contentType: ct, models });
      } catch (e) {
        console.error("[premast] afterContentItemSave hook error:", e);
      }
    }
  }
  return created;
}

/** Returns the updated item, or null when no content item has this id. */
export async function updateContentItem(id, update, { hooks, models } = {}) {
  const { ContentItem } = (await import("../db/models/ContentItem.js"));
  // Snapshot the current document before mutation so the auto-redirect
  // hook can compare oldDoc.slug vs the new value.
  const oldDoc = await ContentItem.findById(id).lean();

  // Allow beforeContentItemSave hooks to enrich the patch (e.g. fill locale).
  const enriched = await runBeforeContentItemSave(
    hooks,
    update,
    "update",
    oldDoc?.contentType,
    oldDoc,
  );

  const item = await ContentItem.findByIdAndUpdate(
    id, { $set: enriched }, { returnDocument: "after", runValidators: true },
  ).lean();
  if (!item) return null;
  // Run afterContentItemSave hooks. The ContentType is needed by
  // the auto-redirect hook to build paths like "/blog/<slug>".
  if (hooks?.afterContentItemSave?.length) {
    const ContentTypeModel = models?.ContentType;
    const ct = ContentTypeModel && item.contentType
      ? await ContentTypeModel.findById(item.contentType).lean()
      : null;
    for (const { fn } of hooks.afterContentItemSave) {
      try {
        await fn({ contentItem: item, action: "update", oldDoc, contentType: ct, models });
      } catch (e) {
        console.error("[premast] afterContentItemSave hook error:", e);
      }
    }
  }
  return item;
}
