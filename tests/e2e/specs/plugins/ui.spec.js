import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
import { createPage } from "../../fixtures/factories.js";

/**
 * UI plugin — sanity check that at least one block from the plugin
 * renders through the Puck pipeline on a published page. We pick
 * BlockquoteBlock because its render output is small, text-based, and
 * doesn't require any client-side hydration (no interactive Ant
 * components), which makes the SSR assertion cheap.
 */
function blockquotePuck(quote, author) {
  return JSON.stringify({
    root: { props: { metaTitle: "UI Plugin Block Test" } },
    content: [
      {
        type: "BlockquoteBlock",
        props: { id: "BlockquoteBlock-e2e", quote, author },
      },
    ],
    zones: {},
  });
}

test.describe("UI plugin", () => {
  test("BlockquoteBlock renders on a published page with the editor's text", async ({ adminRequest, page }) => {
    await createPage(adminRequest, {
      title: "UI Test",
      slug: "ui-block-test",
      content: blockquotePuck("Stay curious.", "Albert Einstein"),
      published: true,
    });

    const res = await page.goto("/ui-block-test");
    expect(res.status()).toBe(200);
    await expect(page.getByRole("blockquote")).toContainText("Stay curious.");
    await expect(page.locator("blockquote").getByText(/Albert Einstein/)).toBeVisible();
  });
});
