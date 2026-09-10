import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";

/**
 * MCP plugin — block types must match the Puck registry.
 *
 * Regression: list_blocks reported the *export* name of each block
 * (`PromoBannerBlock`) instead of the name the site registers it under
 * (`PromoBanner`). Since the write tools validate against that same
 * list, the only types they accepted were types Puck can't render —
 * an update_page would have blanked the page it was editing. Blocks
 * contributed by plugins other than ui/mcp (SymbolBlock) were missing
 * from the list entirely, so they couldn't be written at all.
 *
 * The fixture is `PromoBanner: PromoBannerBlock` in the example site's
 * puckConfig — a block whose registry key differs from its export.
 */

const MCP_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
  "MCP-Protocol-Version": "2025-06-18",
};

async function parseMcpResponse(res) {
  const ct = res.headers()["content-type"] || "";
  const text = await res.text();
  if (ct.includes("application/json")) return JSON.parse(text);
  for (const chunk of text.split(/\n\n/)) {
    const dataLines = chunk
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim());
    if (dataLines.length === 0) continue;
    try {
      return JSON.parse(dataLines.join("\n"));
    } catch {
      /* malformed chunk — keep looking */
    }
  }
  throw new Error(`[mcp] could not parse response (ct=${ct}, body=${text.slice(0, 200)})`);
}

/**
 * Open an authenticated MCP session and return a `call(tool, args)`
 * helper that returns the tool's text payload plus its isError flag.
 */
async function mcpSession(request, adminRequest, name) {
  const created = await adminRequest.post("/api/mcp/tokens", { data: { name } });
  expect(created.status(), `token creation failed: ${await created.text()}`).toBe(201);
  const { data } = await created.json();
  const auth = { ...MCP_HEADERS, Authorization: `Bearer ${data.token}` };

  const init = await request.post("/api/mcp", {
    headers: auth,
    data: {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "premast-e2e", version: "0.0.0" },
      },
    },
  });
  expect(init.status()).toBe(200);
  const sessionId = init.headers()["mcp-session-id"];
  expect(sessionId, "server must return an mcp-session-id").toBeTruthy();

  const headers = { ...auth, "Mcp-Session-Id": sessionId };
  await request.post("/api/mcp", {
    headers,
    data: { jsonrpc: "2.0", method: "notifications/initialized" },
  });

  let id = 1;
  return async function call(toolName, args = {}) {
    const res = await request.post("/api/mcp", {
      headers,
      data: {
        jsonrpc: "2.0",
        id: ++id,
        method: "tools/call",
        params: { name: toolName, arguments: args },
      },
    });
    expect(res.status(), `${toolName} failed: ${res.status()}`).toBe(200);
    const body = await parseMcpResponse(res);
    expect(body.result, `${toolName} returned no result: ${JSON.stringify(body.error)}`).toBeTruthy();
    return {
      text: (body.result.content || []).map((c) => c.text).join("\n"),
      isError: Boolean(body.result.isError),
    };
  };
}

test.describe("MCP plugin — block type names", () => {
  test("list_blocks reports registry names, not export names", async ({ request, adminRequest }) => {
    const call = await mcpSession(request, adminRequest, "mcp-blocks-list");
    const { text, isError } = await call("list_blocks");
    expect(isError, `list_blocks errored: ${text}`).toBe(false);

    const { blocks } = JSON.parse(text);
    expect(blocks.PromoBanner, "renamed block must be listed under its registry key").toBeTruthy();
    expect(
      blocks.PromoBannerBlock,
      "export name is not a valid Puck type and must not be offered",
    ).toBeUndefined();

    // Blocks are discovered across every installed @premast plugin,
    // not a hardcoded ui/mcp pair.
    expect(blocks.SymbolBlock, "symbols plugin block must be discoverable").toBeTruthy();
    expect(blocks.FlexBlock, "ui plugin blocks must still be discoverable").toBeTruthy();

    // i18n builds its block from a factory — `LanguageSwitcher:
    // buildLanguageSwitcherBlock({...})` — so the registry key differs
    // from the file the definition was scanned out of.
    expect(blocks.LanguageSwitcher, "factory-built block must use its registry key").toBeTruthy();
    expect(blocks.LanguageSwitcherBlock).toBeUndefined();
  });

  test("create_page accepts the registry name and stores it verbatim", async ({
    request,
    adminRequest,
  }) => {
    const call = await mcpSession(request, adminRequest, "mcp-blocks-write");
    const created = await call("create_page", {
      title: "Promo",
      slug: "mcp-promo-registry-name",
      content: [{ type: "PromoBanner", props: { heading: "Hello", body: "World" } }],
    });
    expect(created.isError, `create_page rejected the registry name: ${created.text}`).toBe(false);

    const fetched = await call("get_page", { slug: "mcp-promo-registry-name" });
    expect(fetched.isError, fetched.text).toBe(false);
    expect(fetched.text, "stored content must keep the registry type").toContain("PromoBanner");
    expect(fetched.text).not.toContain("PromoBannerBlock");
  });

  test("create_page rejects the export name", async ({ request, adminRequest }) => {
    const call = await mcpSession(request, adminRequest, "mcp-blocks-reject");
    const created = await call("create_page", {
      title: "Promo bad type",
      slug: "mcp-promo-export-name",
      content: [{ type: "PromoBannerBlock", props: { heading: "Hello" } }],
    });
    expect(created.isError, "an unrenderable block type must not be written").toBe(true);
    expect(created.text).toContain("unknown block type");
  });
});
