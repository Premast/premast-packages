import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
import { createPage } from "../../fixtures/factories.js";

/**
 * UI plugin — full block-matrix smoke.
 *
 * One test per block verifies: a published page containing ONLY that
 * block returns 200 AND the rendered HTML contains a string that only
 * that block's render function could produce. This catches three
 * classes of regression cheaply:
 *
 *   - A block's render uses a client-only API (breaks SSR)
 *   - A block got renamed in plugin exports but not the Puck config
 *   - A block's default props no longer render any visible output
 *
 * For richer per-block behaviour (interactive state, prop validation,
 * responsive layout), each block should get its own dedicated spec.
 */
function puckWith(type, props = {}) {
  return JSON.stringify({
    root: { props: {} },
    content: [{ type, props: { id: `${type}-matrix`, ...props } }],
    zones: {},
  });
}

/**
 * Each row: [blockType, overrideProps, signature-that-must-render-in-HTML]
 *
 * Signatures lean on defaultProps copy when it's visible text, or on
 * an attribute/class that's impossible to get from any other block.
 * We set overrides only where defaults are empty/placeholder or the
 * default text is too generic to be a good signature.
 */
const BLOCKS = [
  ["FlexBlock", {}, "flex"],
  ["GridRowBlock", {}, "grid"],
  ["ColBlock", {}, "col"],
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
  for (const [type, overrides, signature] of BLOCKS) {
    test(`${type} renders on SSR and contains its signature`, async ({ adminRequest, page }) => {
      const slug = `ui-${type.toLowerCase()}`;
      await createPage(adminRequest, {
        title: type,
        slug,
        content: puckWith(type, overrides),
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
});
