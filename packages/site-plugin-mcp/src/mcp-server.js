import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import mongoose from "mongoose";

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
/*  Register core Mongoose models (same schemas as site-core)         */
/* ------------------------------------------------------------------ */

async function registerModels() {
  // Only register if not already registered (e.g. by another import)
  if (!mongoose.models.Page) {
    const pageSchema = new mongoose.Schema(
      {
        title: { type: String, required: true, trim: true },
        slug: {
          type: String,
          required: true,
          unique: true,
          lowercase: true,
          trim: true,
          match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        },
        content: { type: String, default: "" },
        published: { type: Boolean, default: false },
      },
      { timestamps: true },
    );
    mongoose.model("Page", pageSchema);
  }

  if (!mongoose.models.Global) {
    const globalSchema = new mongoose.Schema(
      {
        key: {
          type: String,
          required: true,
          unique: true,
          lowercase: true,
          trim: true,
          enum: ["header", "footer"],
        },
        content: { type: String, default: "" },
        published: { type: Boolean, default: false },
      },
      { timestamps: true },
    );
    mongoose.model("Global", globalSchema);
  }

  if (!mongoose.models.ContentType) {
    const contentTypeSchema = new mongoose.Schema(
      {
        name: { type: String, required: true, unique: true, trim: true },
        slug: {
          type: String,
          required: true,
          unique: true,
          lowercase: true,
          trim: true,
          match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        },
        urlPrefix: {
          type: String,
          required: true,
          lowercase: true,
          match: /^\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/,
        },
        templateContent: { type: String, default: "" },
        description: { type: String, default: "" },
        published: { type: Boolean, default: false },
      },
      { timestamps: true },
    );
    mongoose.model("ContentType", contentTypeSchema);
  }

  if (!mongoose.models.ContentItem) {
    const contentItemSchema = new mongoose.Schema(
      {
        title: { type: String, required: true, trim: true },
        slug: {
          type: String,
          required: true,
          lowercase: true,
          trim: true,
          match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        },
        contentType: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ContentType",
          required: true,
        },
        content: { type: String, default: "" },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        published: { type: Boolean, default: false },
      },
      { timestamps: true },
    );
    contentItemSchema.index({ contentType: 1, slug: 1 }, { unique: true });
    mongoose.model("ContentItem", contentItemSchema);
  }

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
  await registerModels();

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
    name: "premast-cms",
    version: "1.2.0",
    capabilities: {
      tools: {},
    },
  });

  // Attach session for auth checks in tools
  server._mcpSession = tokenDoc;

  // 4. Register all tools
  registerAuthTools(server);
  registerBlockTools(server, getBlocks);
  registerPageTools(server, getBlocks);
  registerGlobalTools(server, getBlocks);
  registerContentTypeTools(server, getBlocks);
  registerContentItemTools(server, getBlocks);
  registerSeoTools(server);
  registerInstructionTools(server);

  // 5. Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
