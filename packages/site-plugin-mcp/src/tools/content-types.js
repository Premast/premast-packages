import mongoose from "mongoose";
import { z } from "zod";
import { validatePuckContent } from "../block-discovery.js";

function requireAuth(session) {
  if (!session) {
    throw new Error("Authentication required. Provide MCP_TOKEN in environment.");
  }
}

export function registerContentTypeTools(server, getBlocks) {
  server.tool(
    "list_content_types",
    "List all content types (templates) with name, slug, urlPrefix, and description",
    {},
    async () => {
      requireAuth(server._mcpSession);
      const ContentType = mongoose.models.ContentType;
      const types = await ContentType.find({})
        .sort({ name: 1 })
        .lean();
      // Parse templateContent for readability
      const data = types.map((t) => {
        let templateContent = t.templateContent;
        try {
          templateContent = JSON.parse(t.templateContent);
        } catch {
          // Leave as string
        }
        return { ...t, templateContent };
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ data }, null, 2) }],
      };
    },
  );

  server.tool(
    "get_content_type",
    "Get a content type by ID or slug, including its template content",
    {
      id: z.string().optional().describe("Content type ID"),
      slug: z.string().optional().describe("Content type slug"),
    },
    async ({ id, slug }) => {
      requireAuth(server._mcpSession);
      const ContentType = mongoose.models.ContentType;
      if (!id && !slug) {
        return { content: [{ type: "text", text: "Error: provide either id or slug" }], isError: true };
      }
      const filter = id ? { _id: id } : { slug };
      const ct = await ContentType.findOne(filter).lean();
      if (!ct) {
        return { content: [{ type: "text", text: "Error: content type not found" }], isError: true };
      }
      let templateContent = ct.templateContent;
      try {
        templateContent = JSON.parse(ct.templateContent);
      } catch {
        // Leave as string
      }
      return {
        content: [
          { type: "text", text: JSON.stringify({ data: { ...ct, templateContent } }, null, 2) },
        ],
      };
    },
  );

  server.tool(
    "create_content_type",
    "Create a new content type (template). Use list_blocks first to design the templateContent.",
    {
      name: z.string().describe("Content type name (e.g. 'Blog Post')"),
      slug: z.string().describe("URL slug (e.g. 'blog-post')"),
      urlPrefix: z
        .string()
        .describe("URL prefix (e.g. '/blog'). Must start with /"),
      description: z.string().optional().describe("Description of this content type"),
      templateContent: z
        .array(
          z.object({
            type: z.string(),
            props: z.record(z.any()).optional(),
          }),
        )
        .optional()
        .describe("Template Puck content array — the default layout for items of this type"),
      published: z.boolean().optional().describe("Publish immediately (default: false)"),
    },
    async ({ name, slug, urlPrefix, description, templateContent, published }) => {
      requireAuth(server._mcpSession);
      const ContentType = mongoose.models.ContentType;

      // Validate template content
      if (templateContent && templateContent.length > 0) {
        const { blocks } = await getBlocks();
        const validation = validatePuckContent(templateContent, blocks);
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

      const puckData = templateContent
        ? {
            content: templateContent.map((block) => ({
              type: block.type,
              props: { id: new mongoose.Types.ObjectId().toString(), ...block.props },
            })),
            root: { props: {} },
          }
        : "";

      try {
        const ct = await ContentType.create({
          name,
          slug,
          urlPrefix,
          description: description || "",
          templateContent: puckData ? JSON.stringify(puckData) : "",
          published: Boolean(published),
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { data: { _id: ct._id, name: ct.name, slug: ct.slug, urlPrefix: ct.urlPrefix } },
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
    "update_content_type",
    "Update a content type's name, description, urlPrefix, or template content",
    {
      id: z.string().describe("Content type ID"),
      name: z.string().optional().describe("New name"),
      slug: z.string().optional().describe("New slug"),
      urlPrefix: z.string().optional().describe("New URL prefix"),
      description: z.string().optional().describe("New description"),
      templateContent: z
        .array(
          z.object({
            type: z.string(),
            props: z.record(z.any()).optional(),
          }),
        )
        .optional()
        .describe("New template Puck content array"),
      published: z.boolean().optional().describe("Set published status"),
    },
    async ({ id, name, slug, urlPrefix, description, templateContent, published }) => {
      requireAuth(server._mcpSession);
      const ContentType = mongoose.models.ContentType;

      if (!mongoose.isValidObjectId(id)) {
        return { content: [{ type: "text", text: "Error: invalid content type ID" }], isError: true };
      }

      if (templateContent && templateContent.length > 0) {
        const { blocks } = await getBlocks();
        const validation = validatePuckContent(templateContent, blocks);
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
      if (name !== undefined) update.name = name;
      if (slug !== undefined) update.slug = slug;
      if (urlPrefix !== undefined) update.urlPrefix = urlPrefix;
      if (description !== undefined) update.description = description;
      if (published !== undefined) update.published = published;
      if (templateContent !== undefined) {
        const puckData = {
          content: templateContent.map((block) => ({
            type: block.type,
            props: { id: new mongoose.Types.ObjectId().toString(), ...block.props },
          })),
          root: { props: {} },
        };
        update.templateContent = JSON.stringify(puckData);
      }

      if (Object.keys(update).length === 0) {
        return { content: [{ type: "text", text: "Error: no fields to update" }], isError: true };
      }

      try {
        const ct = await ContentType.findByIdAndUpdate(
          id,
          { $set: update },
          { returnDocument: "after", runValidators: true },
        ).lean();
        if (!ct) {
          return { content: [{ type: "text", text: "Error: content type not found" }], isError: true };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { data: { _id: ct._id, name: ct.name, slug: ct.slug, urlPrefix: ct.urlPrefix } },
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
    "delete_content_type",
    "Delete a content type. Fails if content items of this type exist.",
    {
      id: z.string().describe("Content type ID"),
    },
    async ({ id }) => {
      requireAuth(server._mcpSession);
      const ContentType = mongoose.models.ContentType;
      const ContentItem = mongoose.models.ContentItem;

      if (!mongoose.isValidObjectId(id)) {
        return { content: [{ type: "text", text: "Error: invalid content type ID" }], isError: true };
      }

      // Check for existing content items
      const itemCount = await ContentItem.countDocuments({ contentType: id });
      if (itemCount > 0) {
        return {
          content: [
            {
              type: "text",
              text: `Error: cannot delete — ${itemCount} content item(s) of this type exist. Delete them first.`,
            },
          ],
          isError: true,
        };
      }

      const deleted = await ContentType.findByIdAndDelete(id).lean();
      if (!deleted) {
        return { content: [{ type: "text", text: "Error: content type not found" }], isError: true };
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ deleted: true, name: deleted.name }) }],
      };
    },
  );
}
