import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import mongoose from "mongoose";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { registerModels as registerCoreModels } from "@premast/site-core/db";
import { collectHooks } from "@premast/site-core/services/hooks.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_VERSION = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf-8")).version;

import { validateMcpToken, registerAuthTools } from "./tools/auth.js";
import { registerBlockTools } from "./tools/blocks.js";
import { registerPageTools } from "./tools/pages.js";
import { registerGlobalTools } from "./tools/globals.js";
import { registerContentTypeTools } from "./tools/content-types.js";
import { registerContentItemTools } from "./tools/content-items.js";
import { registerSeoTools } from "./tools/seo.js";
import { registerInstructionTools } from "./tools/instructions.js";
import { discoverAllBlocks } from "./block-discovery.js";

/* ------------------------------------------------------------------ */
/*  DB Connection                                                     */
/* ------------------------------------------------------------------ */

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required");
  }

  const connectOptions = {};
  if (dbName) connectOptions.dbName = dbName;

  await mongoose.connect(uri, connectOptions);
}

/* ------------------------------------------------------------------ */
/*  Register Mongoose models                                          */
/* ------------------------------------------------------------------ */

async function registerModels() {
  // site-core's own models, so this process reads and writes the same
  // schemas as the site, per-locale fields and unique indexes included.
  const models = await registerCoreModels([]);

  if (!mongoose.models.McpToken) {
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
    mongoose.model("McpToken", mcpTokenSchema);
  }

  if (!mongoose.models.McpInstruction) {
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
    mongoose.model("McpInstruction", mcpInstructionSchema);
  }

  if (!mongoose.models.BlockManifest) {
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
    mongoose.model("BlockManifest", blockManifestSchema);
  }

  return models;
}

/* ------------------------------------------------------------------ */
/*  Block cache                                                       */
/* ------------------------------------------------------------------ */

let blockCache = null;
let blockCacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

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
/*  Main                                                              */
/* ------------------------------------------------------------------ */

export async function startMcpServer() {
  // 1. Connect to DB
  await connectDB();
  const models = await registerModels();

  // This process runs outside the site, so there is no site config to
  // take plugin hooks from. Writes run site-core's own save hooks
  // (auto-redirect on a slug change) but not plugin hooks such as
  // i18n's locale fill; the site's /api/mcp endpoint runs both.
  const cms = { hooks: collectHooks([]), models };

  // 2. Validate token
  const rawToken = process.env.MCP_TOKEN;
  const tokenDoc = await validateMcpToken(rawToken);
  if (!tokenDoc) {
    console.error(
      "[premast-mcp] Invalid or missing MCP_TOKEN. Generate one from Admin > MCP Settings.",
    );
    process.exit(1);
  }

  // 3. Create MCP server
  const server = new McpServer({
    name: "cms",
    version: PKG_VERSION,
    capabilities: {
      tools: {},
    },
  });

  // Attach session for auth checks in tools
  server._mcpSession = tokenDoc;

  // 4. Register all tools
  registerAuthTools(server);
  registerBlockTools(server, getBlocks);
  registerPageTools(server, getBlocks, cms);
  registerGlobalTools(server, getBlocks);
  registerContentTypeTools(server, getBlocks);
  registerContentItemTools(server, getBlocks, cms);
  registerSeoTools(server, cms);
  registerInstructionTools(server);

  // 5. Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
