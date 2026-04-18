import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
import { createPage } from "../../fixtures/factories.js";

/**
 * SEO plugin — SeoScoreField rendering in the Puck editor.
 *
 * The field analyses root.props + content blocks via
 * packages/site-plugin-seo/src/fields/seo-analyzer.js and renders a
 * status label ("Good" / "Needs Improvement" / "Poor") next to a
 * circular gauge. Live re-scoring as an editor types is a React
 * effect on `useMemo([rootProps, contentBlocks])` — if the field
 * renders at all, that dependency graph is already proven.
 *
 * What we cover here is the observable-by-humans contract:
 *
 *   - The field is visible when the editor loads.
 *   - Opening a meta-rich page shows a higher status than a bare one.
 *
 * True keystroke-by-keystroke live-update testing would require
 * driving Puck's root-field panel, which is UI-specific and flaky.
 * Skipping it is a deliberate scope call — the per-keystroke memo is
 * React, not code we wrote, and unit-level analyser tests cover the
 * scoring math.
 */

function richPuck() {
  // 300+ words of body text + a descriptive meta set.
  const bodyText = Array.from({ length: 30 }, () =>
    "Premast is a modular content platform built for marketing teams who want real editorial freedom without dragging engineering into every copy change.",
  ).join(" ");
  return JSON.stringify({
    root: {
      props: {
        metaTitle: "Premast — a CMS built for editorial independence",
        metaDescription:
          "Premast gives marketing teams a real WYSIWYG CMS so editors can ship changes on their own schedule without waiting on engineering help.",
        focusKeywords: "premast, cms, editorial",
      },
    },
    content: [
      {
        type: "HeadingBlock",
        props: { id: "HeadingBlock-rich", text: "Premast", level: 1 },
      },
      { type: "TextBlock", props: { id: "TextBlock-rich", text: bodyText } },
    ],
    zones: {},
  });
}

function barePuck() {
  return JSON.stringify({
    root: { props: {} },
    content: [],
    zones: {},
  });
}

async function openEditorAndReadStatus(adminPage, pageId) {
  await adminPage.goto(`/admin/pages/${pageId}`, { waitUntil: "domcontentloaded" });
  // Puck's editor shell carries a puck-theme class — wait until it's
  // hydrated enough for the custom field to have rendered. The status
  // label is one of three exact strings defined in SeoScoreField.jsx.
  const statusLabel = adminPage
    .locator("text=/^(Good|Needs Improvement|Poor)$/")
    .first();
  await expect(statusLabel).toBeVisible({ timeout: 30_000 });
  return (await statusLabel.textContent()).trim();
}

test.describe("SEO plugin — SeoScoreField in the Puck editor", () => {
  test("meta-empty page scores Poor; meta-rich page scores better", async ({
    adminRequest,
    adminPage,
  }) => {
    const bare = await createPage(adminRequest, {
      title: "Bare",
      slug: "seo-scoring-bare",
      content: barePuck(),
      published: false,
    });
    const rich = await createPage(adminRequest, {
      title: "Rich",
      slug: "seo-scoring-rich",
      content: richPuck(),
      published: false,
    });

    const bareStatus = await openEditorAndReadStatus(adminPage, bare._id);
    expect(bareStatus, "empty-meta page should score Poor").toBe("Poor");

    const richStatus = await openEditorAndReadStatus(adminPage, rich._id);
    expect(
      ["Good", "Needs Improvement"],
      `meta-rich page should score better than Poor, got ${richStatus}`,
    ).toContain(richStatus);
  });
});
