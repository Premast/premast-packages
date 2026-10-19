import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";
import { setGlobal } from "../../fixtures/factories.js";
import { mcpSession } from "../../lib/mcp.js";

/**
 * MCP plugin — header/footer per locale.
 *
 * Regression: get_global and update_global looked a global up by key
 * alone. A site on @premast/site-plugin-i18n stores one header per
 * locale (the example site has en and ar), so the tools read or
 * overwrote whichever locale MongoDB returned first: an agent editing
 * the Arabic header could overwrite the English one.
 */

function headerContent(logoText) {
  return JSON.stringify({
    root: { props: {} },
    content: [{ type: "HeaderBlock", props: { id: `HeaderBlock-${logoText}`, logoText } }],
    zones: {},
  });
}

async function seedLocales(request) {
  // The per-test DB wipe also removes the i18n locale list. Reading it
  // re-seeds it from the site config (en, ar) — what the plugin does on
  // first boot.
  const res = await request.get("/api/i18n/locales");
  expect(res.ok()).toBeTruthy();
}

async function seedHeaders(request, adminRequest) {
  await seedLocales(request);
  await setGlobal(adminRequest, "header", { content: headerContent("EN HEADER"), locale: "en" });
  await setGlobal(adminRequest, "header", { content: headerContent("AR HEADER"), locale: "ar" });
}

async function readHeader(adminRequest, locale) {
  const res = await adminRequest.get(`/api/globals/header?locale=${locale}`);
  expect(res.ok(), `no ${locale} header: ${await res.text()}`).toBeTruthy();
  return (await res.json()).data;
}

test.describe("MCP plugin — globals per locale", () => {
  test("get_global returns the requested locale's header", async ({ request, adminRequest }) => {
    await seedHeaders(request, adminRequest);
    const call = await mcpSession(request, adminRequest, "mcp-global-get");

    // Both locales: a lookup by key alone returns the same header for
    // every request, so one of the two would come back wrong.
    for (const locale of ["ar", "en"]) {
      const header = await call("get_global", { key: "header", locale });
      expect(header.isError, header.text).toBe(false);
      expect(JSON.parse(header.text).data.locale).toBe(locale);
      expect(header.text).toContain(`${locale.toUpperCase()} HEADER`);
    }
  });

  test("get_global without a locale returns the default locale's header", async ({
    request,
    adminRequest,
  }) => {
    await seedHeaders(request, adminRequest);
    const call = await mcpSession(request, adminRequest, "mcp-global-default");

    const header = await call("get_global", { key: "header" });
    expect(header.isError, header.text).toBe(false);
    expect(JSON.parse(header.text).data.locale).toBe("en");
    expect(header.text).toContain("EN HEADER");
  });

  test("update_global edits only the requested locale's header", async ({
    request,
    adminRequest,
  }) => {
    await seedHeaders(request, adminRequest);
    const call = await mcpSession(request, adminRequest, "mcp-global-update");

    // Both directions: a write by key alone always lands on the same
    // header, so one of the two edits would hit the wrong locale.
    for (const [locale, other] of [["ar", "en"], ["en", "ar"]]) {
      const logoText = `${locale.toUpperCase()} EDITED`;
      const updated = await call("update_global", {
        key: "header",
        locale,
        content: [{ type: "HeaderBlock", props: { logoText } }],
      });
      expect(updated.isError, updated.text).toBe(false);
      expect(JSON.parse(updated.text).data.locale).toBe(locale);

      expect((await readHeader(adminRequest, locale)).content).toContain(logoText);
      expect(
        (await readHeader(adminRequest, other)).content,
        `the ${other} header must be left alone`,
      ).not.toContain(logoText);
    }
  });

  test("update_global refuses a locale the site doesn't have", async ({ request, adminRequest }) => {
    await seedLocales(request);
    const call = await mcpSession(request, adminRequest, "mcp-global-unknown-locale");

    const refused = await call("update_global", {
      key: "header",
      locale: "de",
      content: [{ type: "HeaderBlock", props: { logoText: "DE HEADER" } }],
    });
    expect(refused.isError, "an unknown locale must not be written").toBe(true);
    expect(refused.text).toContain("en, ar");

    const res = await adminRequest.get("/api/globals");
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data.filter((g) => g.locale === "de"), "no German header may be created").toEqual([]);
  });
});
