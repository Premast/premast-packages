import mongoose from "mongoose";
import { z } from "zod";
import { validatePuckContent } from "../block-discovery.js";

function requireAuth(session) {
  if (!session) {
    throw new Error("Authentication required. Provide MCP_TOKEN in environment.");
  }
}

export function registerContentItemTools(server, getBlocks) {
  server.tool(
    "list_content_items",
    "List content items, optionally filtered by content type",
    {
      contentType: z
        .string()
        .optional()
        .describe("Content type ID to filter by"),
      published: z
        .enum(["true", "false", "all"])
        .optional()
        .describe("Filter by published status. Default: all"),
    },
    async ({ contentType, published }) => {
      requireAuth(server._mcpSession);
      const ContentItem = mongoose.models.ContentItem;
      const filter = {};
      if (contentType) {
        if (!mongoose.isValidObjectId(contentType)) {
          return { content: [{ type: "text", text: "Error: invalid content type ID" }], isError: true };
        }
        filter.contentType = contentType;
      }
      if (published === "true") filter.published = true;
      if (published === "false") filter.published = false;

      const items = await ContentItem.find(filter, {
        title: 1,
        slug: 1,
        contentType: 1,
        published: 1,
        metadata: 1,
        createdAt: 1,
        updatedAt: 1,
      })
        .populate("contentType", "name slug urlPrefix")
        .sort({ updatedAt: -1 })
        .lean();
      return {
        content: [{ type: "text", text: JSON.stringify({ data: items }, null, 2) }],
      };
    },
  );

  server.tool(
    "get_content_item",
    "Get a content item by ID, including its full Puck content",
    {
      id: z.string().describe("Content item ID"),
    },
    async ({ id }) => {
      requireAuth(server._mcpSession);
      const ContentItem = mongoose.models.ContentItem;
      if (!mongoose.isValidObjectId(id)) {
        return { content: [{ type: "text", text: "Error: invalid content item ID" }], isError: true };
      }
      const item = await ContentItem.findById(id)
        .populate("contentType", "name slug urlPrefix")
        .lean();
      if (!item) {
        return { content: [{ type: "text", text: "Error: content item not found" }], isError: true };
      }
      let content = item.content;
      try {
        content = JSON.parse(item.content);
      } catch {
        // Leave as string
      }
      return {
        content: [
          { type: "text", text: JSON.stringify({ data: { ...item, content } }, null, 2) },
        ],
      };
    },
  );

  server.tool(
    "create_content_item",
    "Create a new content item for a given content type. Use list_blocks first to design the content.",
    {
      title: z.string().describe("Item title"),
      slug: z.string().describe("URL slug (unique within the content type)"),
      contentType: z.string().describe("Content type ID this item belongs to"),
      content: z
        .array(
          z.object({
            type: z.string(),
            props: z.record(z.any()).optional(),
          }),
        )
        .optional()
        .describe("Puck content array"),
      root: z
        .object({
          props: z.record(z.any()).optional(),
        })
        .optional()
        .describe("Root-level props (e.g. SEO fields)"),
      metadata: z
        .record(z.any())
        .optional()
        .describe("Arbitrary metadata JSON"),
      published: z.boolean().optional().describe("Publish immediately (default: false)"),
    },
    async ({ title, slug, contentType, content, root, metadata, published }) => {
      requireAuth(server._mcpSession);
      const ContentItem = mongoose.models.ContentItem;
      const ContentTypeModel = mongoose.models.ContentType;

      if (!mongoose.isValidObjectId(contentType)) {
        return { content: [{ type: "text", text: "Error: invalid content type ID" }], isError: true };
      }

      // Verify content type exists
      const ct = await ContentTypeModel.findById(contentType).lean();
      if (!ct) {
        return { content: [{ type: "text", text: "Error: content type not found" }], isError: true };
      }

      // Validate content
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

      const puckData = content
        ? {
            content: content.map((block) => ({
              type: block.type,
              props: { id: new mongoose.Types.ObjectId().toString(), ...block.props },
            })),
            root: root || { props: {} },
          }
        : "";

      try {
        const item = await ContentItem.create({
          title,
          slug,
          contentType,
          content: puckData ? JSON.stringify(puckData) : "",
          metadata: metadata || {},
          published: Boolean(published),
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { data: { _id: item._id, title: item.title, slug: item.slug, contentType: ct.name } },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        const msg = err.code === 11000 ? "slug already exists for this content type" : err.message;
        return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
      }
    },
  );

  server.tool(
    "update_content_item",
    "Update a content item's title, slug, content, metadata, or published status",
    {
      id: z.string().describe("Content item ID"),
      title: z.string().optional().describe("New title"),
      slug: z.string().optional().describe("New slug"),
      content: z
        .array(
          z.object({
            type: z.string(),
            props: z.record(z.any()).optional(),
          }),
        )
        .optional()
        .describe("New Puck content array"),
      root: z
        .object({
          props: z.record(z.any()).optional(),
        })
        .optional()
        .describe("Root-level props (e.g. SEO fields)"),
      metadata: z.record(z.any()).optional().describe("Updated metadata"),
      published: z.boolean().optional().describe("Set published status"),
    },
    async ({ id, title, slug, content, root, metadata, published }) => {
      requireAuth(server._mcpSession);
      const ContentItem = mongoose.models.ContentItem;

      if (!mongoose.isValidObjectId(id)) {
        return { content: [{ type: "text", text: "Error: invalid content item ID" }], isError: true };
      }

      if (content && content.length > 0) {
        const { blocks } = await getBlocks();
        const validation = validatePuckContent(content, blocks);
        if (!validation.valid) {
          return {
            content: [
              {
                type: "text",
                text: `Validation failed:\n${validation.errors.join("\n")}`,
              },
            ],
            isError: true,
          };
        }
      }

      const update = {};
      if (title !== undefined) update.title = title;
      if (slug !== undefined) update.slug = slug;
      if (metadata !== undefined) update.metadata = metadata;
      if (published !== undefined) update.published = published;

      if (content !== undefined) {
        const existing = await ContentItem.findById(id).lean();
        if (!existing) {
          return { content: [{ type: "text", text: "Error: content item not found" }], isError: true };
        }
        let existingPuck = {};
        try {
          existingPuck = JSON.parse(existing.content || "{}");
        } catch {
          existingPuck = {};
        }
        const puckData = {
          content: content.map((block) => ({
            type: block.type,
            props: { id: new mongoose.Types.ObjectId().toString(), ...block.props },
          })),
          root: root || existingPuck.root || { props: {} },
        };
        update.content = JSON.stringify(puckData);
      } else if (root !== undefined) {
        const existing = await ContentItem.findById(id).lean();
        if (!existing) {
          return { content: [{ type: "text", text: "Error: content item not found" }], isError: true };
        }
        let existingPuck = {};
        try {
          existingPuck = JSON.parse(existing.content || "{}");
        } catch {
          existingPuck = {};
        }
        existingPuck.root = root;
        update.content = JSON.stringify(existingPuck);
      }

      if (Object.keys(update).length === 0) {
        return { content: [{ type: "text", text: "Error: no fields to update" }], isError: true };
      }

      try {
        const item = await ContentItem.findByIdAndUpdate(
          id,
          { $set: update },
          { returnDocument: "after", runValidators: true },
        ).lean();
        if (!item) {
          return { content: [{ type: "text", text: "Error: content item not found" }], isError: true };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { data: { _id: item._id, title: item.title, slug: item.slug, published: item.published } },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        const msg = err.code === 11000 ? "slug already exists for this content type" : err.message;
        return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
      }
    },
  );

  server.tool(
    "delete_content_item",
    "Delete a content item by ID",
    {
      id: z.string().describe("Content item ID"),
    },
    async ({ id }) => {
      requireAuth(server._mcpSession);
      const ContentItem = mongoose.models.ContentItem;
      if (!mongoose.isValidObjectId(id)) {
        return { content: [{ type: "text", text: "Error: invalid content item ID" }], isError: true };
      }
      const deleted = await ContentItem.findByIdAndDelete(id).lean();
      if (!deleted) {
        return { content: [{ type: "text", text: "Error: content item not found" }], isError: true };
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, title: deleted.title }) }],
      };
    },
  );
}
