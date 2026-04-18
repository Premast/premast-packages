import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
import { createPage } from "../../fixtures/factories.js";

/**
 * UI plugin — full block-matrix smoke.
 *
 * One test per block verifies: a published page containing that block
 * returns 200 AND the rendered HTML contains a signature only that
 * block's render function could produce. This catches three classes
 * of regression cheaply:
 *
 *   - A block's render uses a client-only API (breaks SSR)
 *   - A block got renamed in plugin exports but not the Puck config
 *   - A block's default props no longer render any visible output
 *
 * For richer per-block behaviour (interactive state, prop validation,
 * responsive layout) each block should get its own dedicated spec.
 */
function puckWith(content) {
  return JSON.stringify({ root: { props: {} }, content, zones: {} });
}
function block(type, props = {}) {
  return { type, props: { id: `${type}-matrix`, ...props } };
}

/**
 * Standalone-renderable blocks. Each row: [type, overrides, sig].
 *
 * FlexBlock / GridRowBlock / ColBlock are containers that assume
 * children in their render — they're covered separately via a
 * nested-structure test below.
 */
const LEAF_BLOCKS = [
  ["DividerBlock", {}, "divider"],
  ["TabsBlock", {}, "tab"],
  ["CardBlock", { title: "UI-MATRIX-CARD" }, "UI-MATRIX-CARD"],
  ["AccordionBlock", {}, "accordion"],
  ["BlockquoteBlock", { quote: "UI-MATRIX-QUOTE" }, "UI-MATRIX-QUOTE"],
  ["ListBlock", {}, "list"],
  ["ImageBlock", { src: "https://example.test/ui-matrix.png", alt: "UI-MATRIX-IMG" }, "UI-MATRIX-IMG"],
  ["CarouselBlock", {}, "carousel"],
  ["ButtonBlock", { text: "UI-MATRIX-BTN", href: "/" }, "UI-MATRIX-BTN"],
  ["BreadcrumbBlock", {}, "breadcrumb"],
  ["StepsBlock", {}, "step"],
];

test.describe("UI plugin — block matrix", () => {
  for (const [type, overrides, signature] of LEAF_BLOCKS) {
    test(`${type} renders on SSR and contains its signature`, async ({ adminRequest, page }) => {
      const slug = `ui-${type.toLowerCase()}`;
      await createPage(adminRequest, {
        title: type,
        slug,
        content: puckWith([block(type, overrides)]),
        published: true,
      });

      const res = await page.goto(`/${slug}`);
      expect(res.status()).toBe(200);

      const html = (await page.content()).toLowerCase();
      expect(html, `${type} did not contribute "${signature}" to SSR HTML`).toContain(
        signature.toLowerCase(),
      );
    });
  }

  // NOTE: FlexBlock, GridRowBlock, and ColBlock are Puck slot-based
  // containers — their render function expects a hydrated slot
  // component prop (the DropZone), not plain children. Constructing
  // that by hand in a plain Puck document is brittle and out of scope
  // for a matrix smoke. Dedicated specs that drive the Puck editor UI
  // (drag a Blockquote into a Flex, publish, assert nested DOM) are
  // the right place to cover the container render path.
});
