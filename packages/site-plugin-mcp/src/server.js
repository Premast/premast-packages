import mongoose from "mongoose";
import crypto from "crypto";

/* ------------------------------------------------------------------ */
/*  Schemas                                                           */
/* ------------------------------------------------------------------ */

const mcpTokenSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    revoked: { type: Boolean, default: false },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const blockManifestSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },
    blocks: { type: mongoose.Schema.Types.Mixed, default: {} },
    categories: { type: mongoose.Schema.Types.Mixed, default: {} },
    rootFields: { type: mongoose.Schema.Types.Mixed, default: {} },
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const mcpInstructionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["brand", "design", "content", "seo", "general"],
      default: "general",
    },
    content: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

/* ------------------------------------------------------------------ */
/*  Auth guard (inlined to avoid importing from site-core at load)    */
/* ------------------------------------------------------------------ */

function getSessionFromCookie(request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)__premast_session=([^;]+)/);
  return match ? match[1] : null;
}

function guardAuth(handler, { roles } = {}) {
  return async (request, params, context) => {
    // Lazy-import site-core auth to verify the JWT
    let session = null;
    try {
      const { verifyToken } = await import("@premast/site-core/auth");
      const token = getSessionFromCookie(request);
      if (token) session = await verifyToken(token);
    } catch {
      // If site-core auth isn't available, try jose directly
      try {
        const { jwtVerify } = await import("jose");
        const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
        const token = getSessionFromCookie(request);
        if (token) {
          const { payload } = await jwtVerify(token, secret);
          session = payload;
        }
      } catch {
        // No valid session
      }
    }

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (roles && !roles.includes(session.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(request, params, { ...context, session });
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateRawToken() {
  return `pmcp_${crypto.randomBytes(32).toString("hex")}`;
}

/* ------------------------------------------------------------------ */
/*  API Handlers                                                      */
/* ------------------------------------------------------------------ */

// POST /api/mcp/tokens  — generate a new token
async function createToken(request, _params, { connectDB, session }) {
  await connectDB();
  const McpToken =
    mongoose.models.McpToken ?? mongoose.model("McpToken", mcpTokenSchema);
  const body = await request.json();
  const { name } = body;
  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  const rawToken = generateRawToken();
  const token = await McpToken.create({
    name,
    tokenHash: hashToken(rawToken),
    userId: session.sub,
  });
  // Return raw token ONCE — it cannot be retrieved later
  return Response.json(
    {
      data: {
        _id: token._id,
        name: token.name,
        token: rawToken,
        createdAt: token.createdAt,
      },
    },
    { status: 201 },
  );
}

// GET /api/mcp/tokens  — list all tokens (without hashes)
async function listTokens(_request, _params, { connectDB }) {
  await connectDB();
  const McpToken =
    mongoose.models.McpToken ?? mongoose.model("McpToken", mcpTokenSchema);
  const tokens = await McpToken.find({}, { tokenHash: 0 })
    .sort({ createdAt: -1 })
    .lean();
  return Response.json({ data: tokens });
}

// DELETE /api/mcp/tokens/:id  — revoke (delete) a token
async function revokeToken(_request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid token id" }, { status: 400 });
  }
  await connectDB();
  const McpToken =
    mongoose.models.McpToken ?? mongoose.model("McpToken", mcpTokenSchema);
  const deleted = await McpToken.findByIdAndDelete(params.id).lean();
  if (!deleted) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: { _id: deleted._id, revoked: true } });
}

// POST /api/mcp/sync-blocks  — save block manifest from puck config
async function syncBlocks(request, _params, { connectDB }) {
  await connectDB();
  const BlockManifest =
    mongoose.models.BlockManifest ??
    mongoose.model("BlockManifest", blockManifestSchema);
  const body = await request.json();
  const { blocks, categories, rootFields } = body;
  if (!blocks || typeof blocks !== "object") {
    return Response.json(
      { error: "blocks object is required" },
      { status: 400 },
    );
  }
  const manifest = await BlockManifest.findOneAndUpdate(
    { key: "default" },
    {
      $set: {
        blocks: blocks || {},
        categories: categories || {},
        rootFields: rootFields || {},
        syncedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" },
  ).lean();
  return Response.json({ data: manifest });
}

// GET /api/mcp/sync-blocks  — read current block manifest
async function getBlockManifest(_request, _params, { connectDB }) {
  await connectDB();
  const BlockManifest =
    mongoose.models.BlockManifest ??
    mongoose.model("BlockManifest", blockManifestSchema);
  const manifest = await BlockManifest.findOne({ key: "default" }).lean();
  return Response.json({ data: manifest || null });
}

/* ------------------------------------------------------------------ */
/*  Instruction Handlers                                              */
/* ------------------------------------------------------------------ */

// GET /api/mcp/instructions — list all instructions
async function listInstructions(_request, _params, { connectDB }) {
  await connectDB();
  const McpInstruction =
    mongoose.models.McpInstruction ??
    mongoose.model("McpInstruction", mcpInstructionSchema);
  const instructions = await McpInstruction.find({})
    .sort({ order: 1, createdAt: 1 })
    .lean();
  return Response.json({ data: instructions });
}

// POST /api/mcp/instructions — create an instruction
async function createInstruction(request, _params, { connectDB }) {
  await connectDB();
  const McpInstruction =
    mongoose.models.McpInstruction ??
    mongoose.model("McpInstruction", mcpInstructionSchema);
  const body = await request.json();
  const { title, category, content, enabled, order } = body;
  if (!title || !content) {
    return Response.json(
      { error: "title and content are required" },
      { status: 400 },
    );
  }
  const instruction = await McpInstruction.create({
    title,
    category: category || "general",
    content,
    enabled: enabled !== false,
    order: order ?? 0,
  });
  return Response.json({ data: instruction }, { status: 201 });
}

// PATCH /api/mcp/instructions/:id — update an instruction
async function updateInstruction(request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid instruction id" }, { status: 400 });
  }
  await connectDB();
  const McpInstruction =
    mongoose.models.McpInstruction ??
    mongoose.model("McpInstruction", mcpInstructionSchema);
  const body = await request.json();
  const allowed = ["title", "category", "content", "enabled", "order"];
  const update = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "no valid fields to update" }, { status: 400 });
  }
  const instruction = await McpInstruction.findByIdAndUpdate(
    params.id,
    { $set: update },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!instruction) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json({ data: instruction });
}

// DELETE /api/mcp/instructions/:id — delete an instruction
async function deleteInstruction(_request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid instruction id" }, { status: 400 });
  }
  await connectDB();
  const McpInstruction =
    mongoose.models.McpInstruction ??
    mongoose.model("McpInstruction", mcpInstructionSchema);
  const deleted = await McpInstruction.findByIdAndDelete(params.id).lean();
  if (!deleted) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json({ data: { _id: deleted._id, deleted: true } });
}

// GET /api/mcp/config  — get MCP server config JSON for copy-paste
async function getMcpConfig(request, _params, {}) {
  const url = new URL(request.url);
  // Behind a reverse proxy (Vercel, Nginx, etc.), request.url is internal
  // (e.g. http://localhost:3000). Use forwarded headers for the real public URL.
  const host = request.headers.get("x-forwarded-host") || url.host;
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const siteUrl = `${proto}://${host}`;

  const config = {
    remote: {
      description: "For Claude Desktop and remote agents — connects to your live site",
      mcpServers: {
        premast: {
          url: `${siteUrl}/api/mcp`,
          headers: {
            Authorization: "Bearer <paste-your-token-here>",
          },
        },
      },
    },
    local: {
      description: "For local development — connects directly to MongoDB",
      mcpServers: {
        premast: {
          command: "node",
          args: [
            "./node_modules/@premast/site-plugin-mcp/bin/premast-mcp.js",
          ],
          env: {
            MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017",
            MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "premast",
            AUTH_SECRET: process.env.AUTH_SECRET || "<your-auth-secret>",
            MCP_TOKEN: "<paste-your-token-here>",
          },
        },
      },
    },
  };
  return Response.json({ data: config });
}

/* ------------------------------------------------------------------ */
/*  MCP HTTP Endpoint (Streamable HTTP transport)                     */
/* ------------------------------------------------------------------ */

let mcpHttpHandler = null;

async function getMcpHttpHandler() {
  if (mcpHttpHandler) return mcpHttpHandler;
  const { createMcpHandler } = await import("./http-handler.js");
  // We need siteConfig but don't have it here — the handler will be
  // initialized on first request using the context's connectDB
  mcpHttpHandler = createMcpHandler;
  return mcpHttpHandler;
}

// Shared handler for GET/POST/DELETE on /api/mcp
// Auth is handled inside the MCP handler via Bearer token
async function mcpEndpoint(request, _params, context) {
  const { createMcpHandler } = await import("./http-handler.js");

  // Build a minimal siteConfig-like object for the handler
  const handler = await createMcpHandler({
    getConnectDB: async () => context.connectDB,
  });

  return handler(request);
}

/* ------------------------------------------------------------------ */
/*  Exports                                                           */
/* ------------------------------------------------------------------ */

export const mcpPluginServer = {
  apiRoutes: [
    // Token management (admin UI)
    {
      path: "mcp/tokens",
      method: "POST",
      handler: guardAuth(createToken, { roles: ["super_admin"] }),
    },
    {
      path: "mcp/tokens",
      method: "GET",
      handler: guardAuth(listTokens, { roles: ["super_admin"] }),
    },
    {
      path: "mcp/tokens/:id",
      method: "DELETE",
      handler: guardAuth(revokeToken, { roles: ["super_admin"] }),
    },
    {
      path: "mcp/config",
      method: "GET",
      handler: guardAuth(getMcpConfig, { roles: ["super_admin"] }),
    },
    // Instructions (admin UI)
    {
      path: "mcp/instructions",
      method: "GET",
      handler: guardAuth(listInstructions, { roles: ["super_admin"] }),
    },
    {
      path: "mcp/instructions",
      method: "POST",
      handler: guardAuth(createInstruction, { roles: ["super_admin"] }),
    },
    {
      path: "mcp/instructions/:id",
      method: "PATCH",
      handler: guardAuth(updateInstruction, { roles: ["super_admin"] }),
    },
    {
      path: "mcp/instructions/:id",
      method: "DELETE",
      handler: guardAuth(deleteInstruction, { roles: ["super_admin"] }),
    },
    // MCP HTTP endpoint (Streamable HTTP transport)
    // Auth is via Bearer token, not session cookie
    { path: "mcp", method: "GET", handler: mcpEndpoint },
    { path: "mcp", method: "POST", handler: mcpEndpoint },
    { path: "mcp", method: "DELETE", handler: mcpEndpoint },
  ],

  models: {
    McpToken: mcpTokenSchema,
    BlockManifest: blockManifestSchema,
    McpInstruction: mcpInstructionSchema,
  },
};
