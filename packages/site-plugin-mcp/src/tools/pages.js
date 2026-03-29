import mongoose from "mongoose";
import { z } from "zod";
import { validatePuckContent } from "../block-discovery.js";

function requireAuth(session) {
  if (!session) {
    throw new Error("Authentication required. Provide MCP_TOKEN in environment.");
  }
}

export function registerPageTools(server, getBlocks) {
  server.tool(
    "list_pages",
    "List all pages with title, slug, published status, and timestamps",
    {
      published: z
        .enum(["true", "false", "all"])
        .optional()
        .describe("Filter by published status. Default: all"),
    },
    async ({ published }) => {
      requireAuth(server._mcpSession);
      const Page = mongoose.models.Page;
      const filter = {};
      if (published === "true") filter.published = true;
      if (published === "false") filter.published = false;
      const pages = await Page.find(filter, {
        title: 1,
        slug: 1,
        published: 1,
        createdAt: 1,
        updatedAt: 1,
      })
        .sort({ updatedAt: -1 })
        .lean();
      return {
        content: [{ type: "text", text: JSON.stringify({ data: pages }, null, 2) }],
      };
    },
  );

  server.tool(
    "get_page",
    "Get a page by ID or slug, including its full Puck content JSON",
    {
      id: z.string().optional().describe("Page ID (MongoDB ObjectId)"),
      slug: z.string().optional().describe("Page slug"),
    },
    async ({ id, slug }) => {
      requireAuth(server._mcpSession);
      const Page = mongoose.models.Page;
      if (!id && !slug) {
        return {
          content: [{ type: "text", text: "Error: provide either id or slug" }],
          isError: true,
        };
      }
      const filter = id ? { _id: id } : { slug };
      const page = await Page.findOne(filter).lean();
      if (!page) {
        return {
          content: [{ type: "text", text: "Error: page not found" }],
          isError: true,
        };
      }
      // Parse content for readability
      let content = page.content;
      try {
        content = JSON.parse(page.content);
      } catch {
        // Leave as string
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ data: { ...page, content } }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "create_page",
    "Create a new page with Puck content. Use list_blocks first to see available blocks and their schemas. The content array must use valid block types with correct props.",
    {
      title: z.string().describe("Page title"),
      slug: z.string().describe("URL slug (lowercase, hyphens only, e.g. 'about-us')"),
      content: z
        .array(
          z.object({
            type: z.string().describe("Block type name (e.g. 'HeroBlock')"),
            props: z.record(z.any()).optional().describe("Block props matching the block's field definitions"),
          }),
        )
        .optional()
        .describe("Array of Puck block objects"),
      root: z
        .object({
          props: z
            .record(z.any())
            .optional()
            .describe("Root-level props (e.g. SEO fields like metaTitle, metaDescription)"),
        })
        .optional()
        .describe("Root/page-level properties including SEO fields"),
      published: z.boolean().optional().describe("Publish immediately (default: false)"),
    },
    async ({ title, slug, content, root, published }) => {
      requireAuth(server._mcpSession);
      const Page = mongoose.models.Page;

      // Validate content against block schemas
      if (content && content.length > 0) {
        const { blocks } = await getBlocks();
        const validation = validatePuckContent(content, blocks);
        if (!validation.valid) {
          return {
            content: [
              {
                type: "text",
                text: `Validation failed:\n${validation.errors.join("\n")}\n\nUse list_blocks to see available blocks and their field schemas.`,
              },
            ],
            isError: true,
          };
        }
      }

      // Build Puck JSON structure
      const puckData = {
        content: (content || []).map((block) => ({
          type: block.type,
          props: { id: new mongoose.Types.ObjectId().toString(), ...block.props },
        })),
        root: root || { props: {} },
      };

      try {
        const page = await Page.create({
          title,
          slug,
          content: JSON.stringify(puckData),
          published: Boolean(published),
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { data: { _id: page._id, title: page.title, slug: page.slug, published: page.published } },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        const msg = err.code === 11000 ? "slug already exists" : err.message;
        return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
      }
    },
  );

  server.tool(
    "update_page",
    "Update an existing page. You can update title, slug, content, root props, and published status. Use list_blocks first for block schemas.",
    {
      id: z.string().describe("Page ID (MongoDB ObjectId)"),
      title: z.string().optional().describe("New page title"),
      slug: z.string().optional().describe("New URL slug"),
      content: z
        .array(
          z.object({
            type: z.string(),
            props: z.record(z.any()).optional(),
          }),
        )
        .optional()
        .describe("New Puck content array (replaces existing)"),
      root: z
        .object({
          props: z.record(z.any()).optional(),
        })
        .optional()
        .describe("Root-level properties (e.g. SEO fields)"),
      published: z.boolean().optional().describe("Set published status"),
    },
    async ({ id, title, slug, content, root, published }) => {
      requireAuth(server._mcpSession);
      const Page = mongoose.models.Page;

      if (!mongoose.isValidObjectId(id)) {
        return { content: [{ type: "text", text: "Error: invalid page ID" }], isError: true };
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
                text: `Validation failed:\n${validation.errors.join("\n")}\n\nUse list_blocks to see available blocks and their field schemas.`,
              },
            ],
            isError: true,
          };
        }
      }

      const update = {};
      if (title !== undefined) update.title = title;
      if (slug !== undefined) update.slug = slug;
      if (published !== undefined) update.published = published;

      if (content !== undefined) {
        // Get existing page to preserve root if not updating it
        const existing = await Page.findById(id).lean();
        if (!existing) {
          return { content: [{ type: "text", text: "Error: page not found" }], isError: true };
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
        // Update only root props
        const existing = await Page.findById(id).lean();
        if (!existing) {
          return { content: [{ type: "text", text: "Error: page not found" }], isError: true };
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
        const page = await Page.findByIdAndUpdate(
          id,
          { $set: update },
          { returnDocument: "after", runValidators: true },
        ).lean();
        if (!page) {
          return { content: [{ type: "text", text: "Error: page not found" }], isError: true };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { data: { _id: page._id, title: page.title, slug: page.slug, published: page.published } },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        const msg = err.code === 11000 ? "slug already exists" : err.message;
        return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
      }
    },
  );

  server.tool(
    "delete_page",
    "Delete a page by ID",
    {
      id: z.string().describe("Page ID (MongoDB ObjectId)"),
    },
    async ({ id }) => {
      requireAuth(server._mcpSession);
      const Page = mongoose.models.Page;
      if (!mongoose.isValidObjectId(id)) {
        return { content: [{ type: "text", text: "Error: invalid page ID" }], isError: true };
      }
      const deleted = await Page.findByIdAndDelete(id).lean();
      if (!deleted) {
        return { content: [{ type: "text", text: "Error: page not found" }], isError: true };
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, slug: deleted.slug }) }],
      };
    },
  );
}
