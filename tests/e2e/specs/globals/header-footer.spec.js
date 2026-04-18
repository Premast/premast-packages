import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
import { setGlobal } from "../../fixtures/factories.js";

test.describe("global header/footer", () => {
  test("published header renders its logo text on public pages", async ({ adminRequest, page }) => {
    const puck = {
      root: { props: {} },
      content: [
        {
          type: "HeaderBlock",
          props: {
            id: "HeaderBlock-e2e",
            logoText: "E2E LOGO",
            navItems: [{ label: "Docs", href: "/docs" }],
          },
        },
      ],
      zones: {},
    };

    await setGlobal(adminRequest, "header", { content: JSON.stringify(puck) });

    await page.goto("/");
    await expect(page.locator("header").getByText("E2E LOGO")).toBeVisible();
  });

  test("footer copyright text from a published footer is rendered", async ({ adminRequest, page }) => {
    const puck = {
      root: { props: {} },
      content: [
        {
          type: "FooterBlock",
          props: { id: "FooterBlock-e2e", copyrightHolder: "E2E CO" },
        },
      ],
      zones: {},
    };
    await setGlobal(adminRequest, "footer", { content: JSON.stringify(puck) });

    await page.goto("/");
    await expect(page.locator("footer").getByText(/E2E CO/)).toBeVisible();
  });
});
