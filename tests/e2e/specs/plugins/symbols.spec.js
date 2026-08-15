import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
import { createPage, setGlobal } from "../../fixtures/factories.js";

/**
 * Symbols plugin (Reusable Components) — covers the promised loop:
 * create a component, publish it, reference it from a page, and see it
 * on the public site.
 *
 * A reference lives on the page in one of two shapes, and both must
 * expand at render:
 *   - `SymbolBlock` with `{ symbolId }` — the generic picker block
 *   - `SymbolRef_<id>` — the per-component palette entry (Puck inserts
 *     by type, so the type is what a drag-and-drop carries)
 */

const heading = (text, id = "h-e2e") => ({
  type: "HeadingBlock",
  props: { id, children: text },
});

const puckDoc = (content) => ({ root: { props: {} }, content, zones: {} });

/** Create a component and (by default) publish it with some content. */
async function createSymbol(request, { name, content, published = true } = {}) {
  const res = await request.post("/api/symbols", {
    data: { name: name ?? `Component ${Date.now()}` },
  });
  if (!res.ok()) throw new Error(`createSymbol failed: ${res.status()} ${await res.text()}`);
  const symbol = (await res.json()).data;

  if (content || published) {
    const patch = await request.patch(`/api/symbols/${symbol._id}`, {
      data: {
        ...(content ? { content: JSON.stringify(puckDoc(content)) } : {}),
        published,
      },
    });
    if (!patch.ok()) {
      throw new Error(`publish failed: ${patch.status()} ${await patch.text()}`);
    }
    return (await patch.json()).data;
  }
  return symbol;
}

test.describe("symbols plugin — routing & auth", () => {
  test("/admin/components loads for super_admin", async ({ adminPage }) => {
    const res = await adminPage.goto("/admin/components");
    expect(res.status()).toBeLessThan(400);
    expect(adminPage.url()).not.toContain("/admin/login");
    await expect(
      adminPage.getByText("Components", { exact: true }).first(),
    ).toBeVisible();
  });

  test("creating a component requires auth", async ({ request, adminRequest }) => {
    const anon = await request.post("/api/symbols", { data: { name: "Nope" } });
    expect(anon.status()).toBe(401);

    const auth = await adminRequest.post("/api/symbols", { data: { name: "Yes" } });
    expect(auth.status(), "POST /api/symbols should be mounted").not.toBe(404);
    expect(auth.ok()).toBe(true);
  });

  test("usage endpoint requires auth", async ({ request, adminRequest }) => {
    const symbol = await createSymbol(adminRequest, { name: "Usage Auth" });
    const anon = await request.get(`/api/symbols/${symbol._id}/usage`);
    expect(anon.status()).toBe(401);
  });
});

test.describe("symbols plugin — create & publish", () => {
  test("a created component appears in the admin list", async ({
    adminRequest,
    adminPage,
  }) => {
    await createSymbol(adminRequest, { name: "Client Logos" });
    await adminPage.goto("/admin/components");
    await expect(adminPage.getByText("Client Logos")).toBeVisible();
  });

  test("only published components are offered to the editor", async ({
    adminRequest,
  }) => {
    await createSymbol(adminRequest, { name: "Live One", published: true });
    await createSymbol(adminRequest, { name: "Draft One", published: false });

    const res = await adminRequest.get("/api/symbols?published=true");
    expect(res.ok()).toBe(true);
    const names = (await res.json()).data.map((s) => s.name);
    expect(names).toContain("Live One");
    expect(names).not.toContain("Draft One");
  });
});

test.describe("symbols plugin — public rendering", () => {
  test("a referenced component renders its content on the public page", async ({
    adminRequest,
    page,
  }) => {
    const symbol = await createSymbol(adminRequest, {
      name: "Banner",
      content: [heading("REUSABLE BANNER")],
    });

    await createPage(adminRequest, {
      slug: "with-component",
      content: JSON.stringify(
        puckDoc([
          { type: "SymbolBlock", props: { id: "ref-1", symbolId: symbol._id } },
        ]),
      ),
    });

    await page.goto("/with-component");
    await expect(page.getByText("REUSABLE BANNER")).toBeVisible();
  });

  test("the generated palette type renders the same content", async ({
    adminRequest,
    page,
  }) => {
    const symbol = await createSymbol(adminRequest, {
      name: "Palette Ref",
      content: [heading("FROM PALETTE")],
    });

    await createPage(adminRequest, {
      slug: "palette-ref",
      content: JSON.stringify(
        puckDoc([{ type: `SymbolRef_${symbol._id}`, props: { id: "ref-2" } }]),
      ),
    });

    await page.goto("/palette-ref");
    await expect(page.getByText("FROM PALETTE")).toBeVisible();
  });

  test("an unpublished component renders nothing on the public page", async ({
    adminRequest,
    page,
  }) => {
    const symbol = await createSymbol(adminRequest, {
      name: "Still A Draft",
      content: [heading("SHOULD NOT APPEAR")],
      published: false,
    });

    await createPage(adminRequest, {
      slug: "draft-component",
      content: JSON.stringify(
        puckDoc([
          { type: "SymbolBlock", props: { id: "ref-3", symbolId: symbol._id } },
        ]),
      ),
    });

    const res = await page.goto("/draft-component");
    expect(res.status()).toBeLessThan(400);
    await expect(page.getByText("SHOULD NOT APPEAR")).toHaveCount(0);
  });

  test("the same component referenced twice renders twice", async ({
    adminRequest,
    page,
  }) => {
    const symbol = await createSymbol(adminRequest, {
      name: "Twice",
      content: [heading("REPEATED")],
    });

    await createPage(adminRequest, {
      slug: "twice",
      content: JSON.stringify(
        puckDoc([
          { type: "SymbolBlock", props: { id: "ref-a", symbolId: symbol._id } },
          { type: "SymbolBlock", props: { id: "ref-b", symbolId: symbol._id } },
        ]),
      ),
    });

    await page.goto("/twice");
    // Ids are namespaced per reference, so both copies must survive.
    await expect(page.getByText("REPEATED")).toHaveCount(2);
  });

  test("a component nested in a layout slot still renders", async ({
    adminRequest,
    page,
  }) => {
    // Regression: expansion used to walk only top-level content, so a
    // component dropped into Flex/Grid/Col silently rendered nothing.
    const symbol = await createSymbol(adminRequest, {
      name: "Nested",
      content: [heading("INSIDE A SLOT")],
    });

    await createPage(adminRequest, {
      slug: "nested-component",
      content: JSON.stringify(
        puckDoc([
          {
            type: "FlexBlock",
            props: {
              id: "flex-1",
              content: [
                { type: "SymbolBlock", props: { id: "ref-4", symbolId: symbol._id } },
              ],
            },
          },
        ]),
      ),
    });

    await page.goto("/nested-component");
    await expect(page.getByText("INSIDE A SLOT")).toBeVisible();
  });

  test("a component used in the header global renders site-wide", async ({
    adminRequest,
    page,
  }) => {
    // Regression: globals rendered in layout.jsx bypassed the render
    // hooks, so a component in the header/footer expanded to nothing.
    const symbol = await createSymbol(adminRequest, {
      name: "Header Band",
      content: [heading("GLOBAL COMPONENT")],
    });

    await setGlobal(adminRequest, "header", {
      content: JSON.stringify(
        puckDoc([
          { type: "SymbolBlock", props: { id: "ref-5", symbolId: symbol._id } },
        ]),
      ),
    });

    await page.goto("/");
    await expect(page.getByText("GLOBAL COMPONENT")).toBeVisible();
  });
});

test.describe("symbols plugin — editing & deletion", () => {
  test("editing a component changes every page referencing it", async ({
    adminRequest,
    page,
  }) => {
    const symbol = await createSymbol(adminRequest, {
      name: "Shared",
      content: [heading("BEFORE EDIT")],
    });

    for (const slug of ["ref-page-one", "ref-page-two"]) {
      await createPage(adminRequest, {
        slug,
        content: JSON.stringify(
          puckDoc([
            { type: "SymbolBlock", props: { id: `r-${slug}`, symbolId: symbol._id } },
          ]),
        ),
      });
    }

    await page.goto("/ref-page-one");
    await expect(page.getByText("BEFORE EDIT")).toBeVisible();

    const patch = await adminRequest.patch(`/api/symbols/${symbol._id}`, {
      data: { content: JSON.stringify(puckDoc([heading("AFTER EDIT")])) },
    });
    expect(patch.ok()).toBe(true);

    // Edited centrally — both pages pick the change up without being touched.
    for (const slug of ["ref-page-one", "ref-page-two"]) {
      await page.goto(`/${slug}`);
      await expect(page.getByText("AFTER EDIT")).toBeVisible();
      await expect(page.getByText("BEFORE EDIT")).toHaveCount(0);
    }
  });

  test("usage reports how many documents reference a component", async ({
    adminRequest,
  }) => {
    const symbol = await createSymbol(adminRequest, {
      name: "Counted",
      content: [heading("COUNTED")],
    });

    const before = await adminRequest.get(`/api/symbols/${symbol._id}/usage`);
    expect(before.ok()).toBe(true);
    expect((await before.json()).data.total).toBe(0);

    await createPage(adminRequest, {
      slug: "counts-one",
      content: JSON.stringify(
        puckDoc([
          { type: "SymbolBlock", props: { id: "ref-6", symbolId: symbol._id } },
        ]),
      ),
    });

    const after = await adminRequest.get(`/api/symbols/${symbol._id}/usage`);
    expect((await after.json()).data.total).toBe(1);
  });

  test("a page referencing a deleted component still loads", async ({
    adminRequest,
    page,
  }) => {
    const symbol = await createSymbol(adminRequest, {
      name: "Doomed",
      content: [heading("GONE SOON")],
    });

    await createPage(adminRequest, {
      slug: "orphan-ref",
      content: JSON.stringify(
        puckDoc([
          { type: "SymbolBlock", props: { id: "ref-7", symbolId: symbol._id } },
        ]),
      ),
    });

    const del = await adminRequest.delete(`/api/symbols/${symbol._id}`);
    expect(del.ok()).toBe(true);

    // The reference resolves to nothing rather than throwing — a dead
    // reference must not take the whole page down.
    const res = await page.goto("/orphan-ref");
    expect(res.status()).toBeLessThan(400);
    await expect(page.getByText("GONE SOON")).toHaveCount(0);
  });
});
