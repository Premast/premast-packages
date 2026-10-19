/**
 * Minimal MCP client for specs: plain JSON-RPC over the Streamable HTTP
 * transport at /api/mcp, the endpoint a remote agent talks to. No SDK
 * client, so protocol-level assertions stay explicit.
 */
import { expect } from "@playwright/test";

const MCP_HEADERS = {
  "Content-Type": "application/json",
  // MCP transports require both content types to be acceptable.
  Accept: "application/json, text/event-stream",
  "MCP-Protocol-Version": "2025-06-18",
};

/**
 * Streamable HTTP responses come back as application/json OR as
 * text/event-stream. Normalise to the parsed JSON-RPC envelope.
 */
async function parseMcpResponse(res) {
  const ct = res.headers()["content-type"] || "";
  const text = await res.text();
  if (ct.includes("application/json")) return JSON.parse(text);
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

/**
 * Create a token as the admin, open an MCP session with it, and return
 * a `call(tool, args)` helper resolving to the tool's text payload and
 * its isError flag.
 */
export async function mcpSession(request, adminRequest, name) {
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
  // Streamable HTTP is session-stateful: later calls must echo the id.
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
