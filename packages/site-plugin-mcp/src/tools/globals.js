import mongoose from "mongoose";
import { z } from "zod";
import { validatePuckContent } from "../block-discovery.js";

function requireAuth(session) {
  if (!session) {
    throw new Error("Authentication required. Provide MCP_TOKEN in environment.");
  }
}

export function registerGlobalTools(server, getBlocks) {
  server.tool(
    "list_globals",
    "List all globals (header, footer) with their published status",
    {},
    async () => {
      requireAuth(server._mcpSession);
      const Global = mongoose.models.Global;
      const globals = await Global.find({}, { key: 1, published: 1, updatedAt: 1 })
        .sort({ key: 1 })
        .lean();
      return {
        content: [{ type: "text", text: JSON.stringify({ data: globals }, null, 2) }],
      };
    },
  );

  server.tool(
    "get_global",
    "Get a global element (header or footer) including its Puck content",
    {
      key: z.enum(["header", "footer"]).describe("Global key: 'header' or 'footer'"),
    },
    async ({ key }) => {
      requireAuth(server._mcpSession);
      const Global = mongoose.models.Global;
      const global = await Global.findOne({ key }).lean();
      if (!global) {
        return { content: [{ type: "text", text: `Error: global "${key}" not found. It may not have been created yet.` }], isError: true };
      }
      let content = global.content;
      try {
        content = JSON.parse(global.content);
      } catch {
        // Leave as string
      }
      return {
        content: [
          { type: "text", text: JSON.stringify({ data: { ...global, content } }, null, 2) },
        ],
      };
    },
  );

  server.tool(
    "update_global",
    "Update a global element (header or footer) with Puck content. Use list_blocks first for block schemas.",
    {
      key: z.enum(["header", "footer"]).describe("Global key: 'header' or 'footer'"),
      content: z
        .array(
          z.object({
            type: z.string(),
            props: z.record(z.any()).optional(),
          }),
        )
        .optional()
        .describe("New Puck content array"),
      published: z.boolean().optional().describe("Set published status"),
    },
    async ({ key, content, published }) => {
      requireAuth(server._mcpSession);
      const Global = mongoose.models.Global;

      // Validate content if provided
      if (content && content.length > 0) {
        const { blocks } = await getBlocks();
        const validation = validatePuckContent(content, blocks);
        if (!validation.valid) {
          return {
            content: [
              {
                type: "text",
                text: `Validation failed:\n${validation.errors.join("\n")}\n\nUse list_blocks to see available blocks.`,
              },
            ],
            isError: true,
          };
        }
      }

      const update = {};
      if (content !== undefined) {
        const puckData = {
          content: content.map((block) => ({
            type: block.type,
            props: { id: new mongoose.Types.ObjectId().toString(), ...block.props },
          })),
          root: { props: {} },
        };
        update.content = JSON.stringify(puckData);
      }
      if (published !== undefined) update.published = published;

      if (Object.keys(update).length === 0) {
        return { content: [{ type: "text", text: "Error: no fields to update" }], isError: true };
      }

      const global = await Global.findOneAndUpdate(
        { key },
        { $set: update },
        { returnDocument: "after", upsert: true, runValidators: true },
      ).lean();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { data: { _id: global._id, key: global.key, published: global.published } },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
