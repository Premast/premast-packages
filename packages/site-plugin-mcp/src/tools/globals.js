import mongoose from "mongoose";
import { z } from "zod";
import { validatePuckContent } from "../block-discovery.js";
import { resolveLocale } from "../site-locales.js";

function requireAuth(session) {
  if (!session) {
    throw new Error("Authentication required. Provide MCP_TOKEN in environment.");
  }
}

const localeArg = z
  .string()
  .nullish()
  .describe(
    "Locale code, e.g. 'en'. A multi-language site has a separate header and footer per locale; " +
      "this defaults to the site's default locale. Omit it on a single-language site.",
  );

export function registerGlobalTools(server, getBlocks) {
  server.tool(
    "list_globals",
    "List all globals (header, footer) with their locale and published status",
    {},
    async () => {
      requireAuth(server._mcpSession);
      const Global = mongoose.models.Global;
      const globals = await Global.find({}, { key: 1, locale: 1, published: 1, updatedAt: 1 })
        .sort({ key: 1, locale: 1 })
        .lean();
      return {
        content: [{ type: "text", text: JSON.stringify({ data: globals }, null, 2) }],
      };
    },
  );

  server.tool(
    "get_global",
    "Get a global element (header or footer) including its Puck content. On a multi-language site, pass locale to pick which language's copy (default: the site's default locale).",
    {
      key: z.enum(["header", "footer"]).describe("Global key: 'header' or 'footer'"),
      locale: localeArg,
    },
    async ({ key, locale: requested }) => {
      requireAuth(server._mcpSession);
      const Global = mongoose.models.Global;
      const { locale, error } = await resolveLocale(requested);
      if (error) {
        return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
      }
      const global = await Global.findOne({ key, locale }).lean();
      if (!global) {
        const where = locale ? ` for locale "${locale}"` : "";
        return { content: [{ type: "text", text: `Error: global "${key}" not found${where}. It may not have been created yet.` }], isError: true };
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
    "Update a global element (header or footer) with Puck content. On a multi-language site, pass locale to pick which language's copy to edit (default: the site's default locale); other locales are left untouched, and a locale the site doesn't have is refused. Use list_blocks first for block schemas.",
    {
      key: z.enum(["header", "footer"]).describe("Global key: 'header' or 'footer'"),
      locale: localeArg,
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
    async ({ key, locale: requested, content, published }) => {
      requireAuth(server._mcpSession);
      const Global = mongoose.models.Global;
      const { locale, error } = await resolveLocale(requested);
      if (error) {
        return { content: [{ type: "text", text: `Error: ${error}` }], isError: true };
      }

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

      // Globals are stored per (key, locale). The upsert creates a missing
      // header/footer only for a locale resolveLocale accepted.
      const global = await Global.findOneAndUpdate(
        { key, locale },
        { $set: update },
        { returnDocument: "after", upsert: true, runValidators: true },
      ).lean();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { data: { _id: global._id, key: global.key, locale: global.locale, published: global.published } },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
