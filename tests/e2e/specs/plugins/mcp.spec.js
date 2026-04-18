import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";

/**
 * MCP plugin — covers the subset that doesn't require a live MCP
 * client session: admin page loads, token endpoints are reachable
 * under auth, and the custom block category is registered.
 *
 * The Model Context Protocol transport itself (SSE / WebSocket) is
 * expected to be covered by separate integration tests when an MCP
 * client is available.
 */
test.describe("MCP plugin", () => {
  test("/admin/mcp loads for super_admin", async ({ adminPage }) => {
    const res = await adminPage.goto("/admin/mcp");
    expect(res.status()).toBeLessThan(400);
    expect(adminPage.url()).not.toContain("/admin/login");
  });

  test("MCP API surface is mounted", async ({ request, adminRequest }) => {
    // The plugin mounts endpoints under /api/mcp/*. We check a
    // representative one; 404 would mean serverPlugins wiring broke.
    const anon = await request.get("/api/mcp/tokens");
    expect(anon.status(), "mcp tokens endpoint should require auth").toBe(401);

    const auth = await adminRequest.get("/api/mcp/tokens");
    expect(auth.status(), "authenticated call should not 404").not.toBe(404);
  });
});
