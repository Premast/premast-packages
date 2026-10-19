import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
import { createContentItem, createContentType, createPage } from "../../fixtures/factories.js";
import { mcpSession } from "../../lib/mcp.js";
import { connect } from "../../lib/mongo.js";

/**
 * MCP plugin — writes run the CMS save hooks.
 *
 * Regression: the page and content item tools wrote to MongoDB directly,
 * skipping the hooks every admin save runs. On a live site that meant:
 *   - a slug renamed through MCP got no 301 from its old path (core
 *     auto-redirect), so the old URL started returning 404;
 *   - a page or item created through MCP on a multi-language site got no
 *     locale (the i18n plugin fills it in a beforeXSave hook).
 *
 * Redirects are checked on /api/redirects, as pages/crud.spec.js does for
 * an admin rename.
 */

/**
 * The stored document, read straight from Mongo. Raw access is needed
 * here: every API request runs the i18n plugin's afterDbConnect
 * backfill, which fills in a missing locale before an API read could
 * show that the save never set one.
 */
async function storedDoc(collection, id) {
  const mongoose = await connect();
  return mongoose.connection.db
    .collection(collection)
    .findOne({ _id: new mongoose.Types.ObjectId(id) });
}

async function findRedirect(adminRequest, fromPath) {
  const res = await adminRequest.get("/api/redirects");
  expect(res.ok()).toBeTruthy();
  const { data } = await res.json();
  return data.find((r) => r.fromPath === fromPath);
}

test.describe("MCP plugin — save hooks", () => {
  test("renaming a page's slug redirects its old path", async ({ request, adminRequest }) => {
    const page = await createPage(adminRequest, { title: "Old Name", slug: "mcp-old-name" });
    const call = await mcpSession(request, adminRequest, "mcp-page-rename");

    const renamed = await call("update_page", { id: page._id, slug: "mcp-new-name" });
    expect(renamed.isError, renamed.text).toBe(false);

    const redirect = await findRedirect(adminRequest, "/mcp-old-name");
    expect(redirect, "expected an auto-slug-change redirect from the old path").toBeTruthy();
    expect(redirect.toPath).toBe("/mcp-new-name");
    expect(redirect.statusCode).toBe(301);
    expect(redirect.source).toBe("auto-slug-change");
  });

  test("renaming a content item's slug redirects its old path", async ({ request, adminRequest }) => {
    const ct = await createContentType(adminRequest, {
      name: "MCP Guides",
      slug: "mcp-guides",
      urlPrefix: "/mcp-guides",
    });
    const item = await createContentItem(adminRequest, ct._id, { title: "Old Guide", slug: "old-guide" });
    const call = await mcpSession(request, adminRequest, "mcp-item-rename");

    const renamed = await call("update_content_item", { id: item._id, slug: "new-guide" });
    expect(renamed.isError, renamed.text).toBe(false);

    const redirect = await findRedirect(adminRequest, "/mcp-guides/old-guide");
    expect(redirect, "expected an auto-slug-change redirect from the old path").toBeTruthy();
    expect(redirect.toPath).toBe("/mcp-guides/new-guide");
    expect(redirect.source).toBe("auto-slug-change");
  });

  test("a page created through MCP gets the site's default locale", async ({ request, adminRequest }) => {
    const call = await mcpSession(request, adminRequest, "mcp-page-locale");

    const created = await call("create_page", { title: "MCP Locale", slug: "mcp-locale" });
    expect(created.isError, created.text).toBe(false);
    const { _id } = JSON.parse(created.text).data;

    const page = await storedDoc("pages", _id);
    expect(page.locale).toBe("en");
    expect(page.translationGroupId, "i18n links each page to a translation group").toBeTruthy();
  });

  test("a content item created through MCP gets the site's default locale", async ({
    request,
    adminRequest,
  }) => {
    const ct = await createContentType(adminRequest, {
      name: "MCP Notes",
      slug: "mcp-notes",
      urlPrefix: "/mcp-notes",
    });
    const call = await mcpSession(request, adminRequest, "mcp-item-locale");

    const created = await call("create_content_item", {
      title: "MCP Note",
      slug: "mcp-note",
      contentType: ct._id,
    });
    expect(created.isError, created.text).toBe(false);
    const { _id } = JSON.parse(created.text).data;

    const item = await storedDoc("contentitems", _id);
    expect(item.locale).toBe("en");
  });
});
