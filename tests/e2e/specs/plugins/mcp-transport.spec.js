import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";

/**
 * MCP plugin — Streamable HTTP transport.
 *
 * The plugin exposes /api/mcp as a Model Context Protocol endpoint
 * over JSON-RPC 2.0, authenticated by a Bearer token. We verify the
 * full round-trip end-to-end:
 *
 *   1. Admin creates a token via /api/mcp/tokens (returns the raw
 *      token once — it can't be retrieved later).
 *   2. A client hitting /api/mcp with that Bearer token can run
 *      `initialize` and receive a MCP server response with
 *      capabilities.
 *   3. `tools/list` returns the registered tools (pages, content
 *      types, auth, blocks, etc.) — proof the tool registrations
 *      actually wired.
 *   4. Requests with no token / a wrong token are rejected 401.
 *
 * We bypass the official MCP SDK client here. The Streamable HTTP
 * transport is plain JSON-RPC; using a raw fetch keeps the test
 * dependency-free and makes protocol-level assertions explicit.
 */

const MCP_HEADERS = {
  "Content-Type": "application/json",
  // MCP transports require both content types to be acceptable.
  Accept: "application/json, text/event-stream",
  "MCP-Protocol-Version": "2025-06-18",
};

/**
 * Streamable HTTP responses can come back as application/json OR as
 * text/event-stream. Normalise to the parsed JSON-RPC envelope.
 */
async function parseMcpResponse(res) {
  const ct = res.headers()["content-type"] || "";
  const text = await res.text();
  if (ct.includes("application/json")) {
    return JSON.parse(text);
  }
  // SSE: each event is "data: <json>\n\n"
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

async function createToken(adminRequest, name = "e2e-mcp-token") {
  const res = await adminRequest.post("/api/mcp/tokens", {
    data: { name },
  });
  expect(res.status(), `token creation failed: ${await res.text()}`).toBe(201);
  const { data } = await res.json();
  expect(data.token, "raw token must be returned exactly once").toBeTruthy();
  return { id: data._id, raw: data.token };
}

test.describe("MCP plugin — JSON-RPC over HTTP", () => {
  test("initialize handshake returns server capabilities", async ({ request, adminRequest }) => {
    const { raw } = await createToken(adminRequest, "mcp-init");

    const res = await request.post("/api/mcp", {
      headers: { ...MCP_HEADERS, Authorization: `Bearer ${raw}` },
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
    expect(res.status(), `initialize failed: ${res.status()} ${await res.text()}`).toBe(200);

    const body = await parseMcpResponse(res);
    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe(1);
    expect(body.result, "initialize must return a result").toBeTruthy();
    expect(body.result.protocolVersion).toBeTruthy();
    expect(body.result.serverInfo?.name, "server must identify itself").toBeTruthy();
    expect(body.result.capabilities, "server must advertise capabilities").toBeTruthy();
  });

  test("tools/list returns the registered tools", async ({ request, adminRequest }) => {
    const { raw } = await createToken(adminRequest, "mcp-tools");

    // Initialize first — some servers require it before other methods.
    await request.post("/api/mcp", {
      headers: { ...MCP_HEADERS, Authorization: `Bearer ${raw}` },
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

    const res = await request.post("/api/mcp", {
      headers: { ...MCP_HEADERS, Authorization: `Bearer ${raw}` },
      data: { jsonrpc: "2.0", id: 2, method: "tools/list" },
    });
    expect(res.status()).toBe(200);

    const body = await parseMcpResponse(res);
    expect(body.jsonrpc).toBe("2.0");
    expect(body.result?.tools, "tools/list must return a tools array").toBeInstanceOf(Array);
    expect(body.result.tools.length, "at least one tool should be registered").toBeGreaterThan(0);

    // Tool names follow the pattern <area>_<verb>. We don't pin on
    // specific names (they evolve) but assert we see a few broad areas.
    const names = body.result.tools.map((t) => t.name).join(" ");
    expect(names).toMatch(/page/i);
  });

  test("missing Bearer token is rejected 401", async ({ request }) => {
    const res = await request.post("/api/mcp", {
      headers: MCP_HEADERS,
      data: { jsonrpc: "2.0", id: 1, method: "initialize" },
    });
    expect(res.status()).toBe(401);
  });

  test("invalid Bearer token is rejected 401", async ({ request }) => {
    const res = await request.post("/api/mcp", {
      headers: { ...MCP_HEADERS, Authorization: "Bearer this-is-not-a-real-token" },
      data: { jsonrpc: "2.0", id: 1, method: "initialize" },
    });
    expect(res.status()).toBe(401);
  });

  test("revoked token stops working", async ({ request, adminRequest }) => {
    const { id, raw } = await createToken(adminRequest, "mcp-revoke");

    // Token is valid before revocation.
    const before = await request.post("/api/mcp", {
      headers: { ...MCP_HEADERS, Authorization: `Bearer ${raw}` },
      data: { jsonrpc: "2.0", id: 1, method: "initialize" },
    });
    expect(before.status()).toBe(200);

    // Revoke.
    const del = await adminRequest.delete(`/api/mcp/tokens/${id}`);
    expect(del.ok()).toBeTruthy();

    // Same call with same token is now 401.
    const after = await request.post("/api/mcp", {
      headers: { ...MCP_HEADERS, Authorization: `Bearer ${raw}` },
      data: { jsonrpc: "2.0", id: 2, method: "initialize" },
    });
    expect(after.status()).toBe(401);
  });
});
