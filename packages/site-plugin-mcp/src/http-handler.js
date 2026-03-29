import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import crypto from "crypto";

import { registerAuthTools } from "./tools/auth.js";
import { registerBlockTools } from "./tools/blocks.js";
import { registerPageTools } from "./tools/pages.js";
import { registerGlobalTools } from "./tools/globals.js";
import { registerContentTypeTools } from "./tools/content-types.js";
import { registerContentItemTools } from "./tools/content-items.js";
import { registerSeoTools } from "./tools/seo.js";
import { registerInstructionTools } from "./tools/instructions.js";
import { discoverAllBlocks } from "./block-discovery.js";

/* ------------------------------------------------------------------ */
/*  Block cache                                                       */
/* ------------------------------------------------------------------ */

let blockCache = null;
let blockCacheTime = 0;
const CACHE_TTL = 60_000;

async function getBlocks() {
  const now = Date.now();
  if (blockCache && now - blockCacheTime < CACHE_TTL) {
    return blockCache;
  }
  blockCache = await discoverAllBlocks();
  blockCacheTime = now;
  return blockCache;
}

/* ------------------------------------------------------------------ */
/*  Token validation                                                  */
/* ------------------------------------------------------------------ */

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function validateToken(rawToken, mongoose) {
  if (!rawToken) return null;
  const hash = hashToken(rawToken);
  const McpToken = mongoose.models.McpToken;
  if (!McpToken) return null;

  const token = await McpToken.findOne({ tokenHash: hash, revoked: false });
  if (!token) return null;

  McpToken.updateOne(
    { _id: token._id },
    { $set: { lastUsedAt: new Date() } },
  ).catch(() => {});

  return token;
}

/* ------------------------------------------------------------------ */
/*  Session store — maps session IDs to MCP server+transport pairs    */
/* ------------------------------------------------------------------ */

const sessions = new Map();

function cleanupStaleSessions() {
  const MAX_AGE = 30 * 60_000; // 30 minutes
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > MAX_AGE) {
      session.transport.close().catch(() => {});
      sessions.delete(id);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupStaleSessions, 5 * 60_000).unref?.();

/* ------------------------------------------------------------------ */
/*  Create an MCP server instance for a session                       */
/* ------------------------------------------------------------------ */

function createMcpServer(tokenDoc) {
  const server = new McpServer({
    name: "premast-cms",
    version: "1.2.0",
    capabilities: { tools: {} },
  });

  server._mcpSession = tokenDoc;

  registerAuthTools(server);
  registerBlockTools(server, getBlocks);
  registerPageTools(server, getBlocks);
  registerGlobalTools(server, getBlocks);
  registerContentTypeTools(server, getBlocks);
  registerContentItemTools(server, getBlocks);
  registerSeoTools(server);
  registerInstructionTools(server);

  return server;
}

/* ------------------------------------------------------------------ */
/*  Exported handler — wire into Next.js route handler                */
/* ------------------------------------------------------------------ */

/**
 * Creates a Next.js-compatible route handler for the MCP HTTP endpoint.
 *
 * Usage in your site's `app/api/mcp/route.js`:
 *
 *   import { createMcpHandler } from "@premast/site-plugin-mcp/http";
 *   import { siteConfig } from "@/site.config";
 *
 *   const handler = await createMcpHandler(siteConfig);
 *   export { handler as GET, handler as POST, handler as DELETE };
 *
 * @param {object} siteConfig — the site config from createSiteConfig()
 */
export async function createMcpHandler(siteConfig) {
  // Get connectDB and ensure models are registered
  const connectDB = await siteConfig.getConnectDB();

  return async function mcpHandler(request) {
    const mongoose = (await import("mongoose")).default;

    // Ensure DB is connected and models registered
    await connectDB();

    // Extract token from Authorization header or query param
    const authHeader = request.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    const url = new URL(request.url);
    const queryToken = url.searchParams.get("token");
    const rawToken = bearerToken || queryToken;

    // Validate token
    const tokenDoc = await validateToken(rawToken, mongoose);
    if (!tokenDoc) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing MCP token. Pass via Authorization: Bearer <token>" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Check for existing session
    const sessionId = request.headers.get("mcp-session-id");
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      session.lastActivity = Date.now();
      return session.transport.handleRequest(request);
    }

    // For new sessions (POST without session ID = initialization)
    if (request.method === "POST" && !sessionId) {
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, { transport, server, lastActivity: Date.now() });
        },
        onsessionclosed: (id) => {
          sessions.delete(id);
        },
      });

      const server = createMcpServer(tokenDoc);
      await server.connect(transport);

      return transport.handleRequest(request);
    }

    // If session ID provided but not found
    if (sessionId && !sessions.has(sessionId)) {
      return new Response(
        JSON.stringify({ error: "Session not found. Re-initialize." }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // GET without session (standalone SSE not supported without session)
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({ error: "MCP endpoint. Use POST to initialize a session." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response("Method not allowed", { status: 405 });
  };
}
