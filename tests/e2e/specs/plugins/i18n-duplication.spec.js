import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
import { createPage, createContentType, createContentItem, setGlobal } from "../../fixtures/factories.js";

/**
 * i18n plugin — translation-group duplication.
 *
 * The admin UI triggers POST /api/i18n/duplicate{,-global,-content-item}
 * to create a locale-sibling of an existing Page/Global/ContentItem.
 * Both documents then share a translationGroupId, so the site can
 * render hreflang alternates and switch between locales.
 *
 * The /admin/translations page in the full-site example is a coverage
 * dashboard — it surfaces which documents have which locales — but
 * the duplication trigger itself lives in the per-document editors.
 * Rather than drive those editor UIs (flaky + high maintenance), we
 * exercise the same endpoints the UI calls. The user-observable
 * outcome is identical.
 */

test.describe("i18n plugin — Page duplication", () => {
  test("duplicating a Page to a new locale creates a sibling sharing a translationGroupId", async ({
    adminRequest,
  }) => {
    const source = await createPage(adminRequest, {
      title: "About — English",
      slug: "about-en",
      content: JSON.stringify({
        root: { props: { metaTitle: "About us" } },
        content: [],
        zones: {},
      }),
      published: true,
    });

    const dup = await adminRequest.post("/api/i18n/duplicate", {
      data: { sourceId: source._id, targetLocale: "ar", newSlug: "about-ar" },
    });
    expect(dup.status()).toBe(201);
    const { page: sibling } = await dup.json();

    expect(sibling.locale).toBe("ar");
    expect(sibling.slug).toBe("about-ar");
    expect(sibling.translationGroupId).toBeTruthy();

    // The source's translationGroupId should now exist (the handler
    // upgrades legacy pages on demand) and match the sibling's.
    const reRead = await adminRequest.get(`/api/pages/${source._id}`);
    const { data: sourceRefreshed } = await reRead.json();
    expect(sourceRefreshed.translationGroupId).toBe(sibling.translationGroupId);

    // GET /api/i18n/group/:id should return both pages.
    const group = await adminRequest.get(
      `/api/i18n/group/${sibling.translationGroupId}`,
    );
    expect(group.ok()).toBeTruthy();
    const body = await group.json();
    const locales = body.pages.map((p) => p.locale).sort();
    expect(locales).toEqual(["ar", "en"]);
  });

  test("duplicating into a locale that already has this slug returns 409", async ({ adminRequest }) => {
    const source = await createPage(adminRequest, {
      title: "Contact",
      slug: "contact",
      published: true,
    });

    // First duplication succeeds.
    const first = await adminRequest.post("/api/i18n/duplicate", {
      data: { sourceId: source._id, targetLocale: "ar", newSlug: "contact-ar" },
    });
    expect(first.status()).toBe(201);

    // Second duplication into the same (slug, locale) cell collides.
    const second = await adminRequest.post("/api/i18n/duplicate", {
      data: { sourceId: source._id, targetLocale: "ar", newSlug: "contact-ar" },
    });
    expect(second.status()).toBe(409);
  });

  test("missing sourceId or targetLocale returns 400", async ({ adminRequest }) => {
    const noSource = await adminRequest.post("/api/i18n/duplicate", {
      data: { targetLocale: "ar" },
    });
    expect(noSource.status()).toBe(400);

    const noLocale = await adminRequest.post("/api/i18n/duplicate", {
      data: { sourceId: "000000000000000000000000" },
    });
    expect(noLocale.status()).toBe(400);
  });
});

test.describe("i18n plugin — Global & ContentItem duplication", () => {
  test("a global can be duplicated to another locale", async ({ adminRequest }) => {
    // Seed: patch the en header (the i18n backfill creates it with locale=en).
    await setGlobal(adminRequest, "header", {
      content: JSON.stringify({
        root: { props: {} },
        content: [{ type: "HeaderBlock", props: { id: "h", logoText: "EN" } }],
        zones: {},
      }),
      locale: "en",
    });

    const dup = await adminRequest.post("/api/i18n/duplicate-global", {
      data: { key: "header", sourceLocale: "en", targetLocale: "ar" },
    });
    expect(dup.status()).toBe(201);

    // The AR copy should now be fetchable via ?locale=ar.
    const fetched = await adminRequest.get("/api/globals/header?locale=ar");
    expect(fetched.ok()).toBeTruthy();
    const { data } = await fetched.json();
    expect(data.locale).toBe("ar");
    expect(data.content).toContain("EN"); // copied from source
  });

  test("a content item can be duplicated to another locale", async ({ adminRequest }) => {
    const ct = await createContentType(adminRequest, {
      name: "Guides",
      slug: "guides-i18n",
      urlPrefix: "/guides-i18n",
    });
    const source = await createContentItem(adminRequest, ct._id, {
      title: "Getting Started",
      slug: "getting-started",
      published: true,
    });

    const dup = await adminRequest.post("/api/i18n/duplicate-content-item", {
      data: {
        sourceId: source._id,
        targetLocale: "ar",
        newSlug: "getting-started-ar",
      },
    });
    expect(dup.status()).toBe(201);
    const { contentItem: sibling } = await dup.json();
    expect(sibling.locale).toBe("ar");
    expect(sibling.slug).toBe("getting-started-ar");
    expect(sibling.translationGroupId).toBeTruthy();
  });
});
