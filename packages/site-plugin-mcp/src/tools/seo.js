import mongoose from "mongoose";
import { z } from "zod";

function requireAuth(session) {
  if (!session) {
    throw new Error("Authentication required. Provide MCP_TOKEN in environment.");
  }
}

export function registerSeoTools(server) {
  server.tool(
    "get_seo",
    "Get SEO metadata for a page. Returns metaTitle, metaDescription, ogImage, etc. from the page's root props.",
    {
      pageId: z.string().describe("Page ID"),
    },
    async ({ pageId }) => {
      requireAuth(server._mcpSession);
      const Page = mongoose.models.Page;

      if (!mongoose.isValidObjectId(pageId)) {
        return { content: [{ type: "text", text: "Error: invalid page ID" }], isError: true };
      }

      const page = await Page.findById(pageId).lean();
      if (!page) {
        return { content: [{ type: "text", text: "Error: page not found" }], isError: true };
      }

      let puckData = {};
      try {
        puckData = JSON.parse(page.content || "{}");
      } catch {
        puckData = {};
      }

      const rootProps = puckData.root?.props || {};
      const seoFields = {
        metaTitle: rootProps.metaTitle || "",
        metaDescription: rootProps.metaDescription || "",
        ogImage: rootProps.ogImage || "",
        ogType: rootProps.ogType || "",
        twitterCard: rootProps.twitterCard || "",
        canonicalUrl: rootProps.canonicalUrl || "",
        noIndex: rootProps.noIndex || "false",
        structuredData: rootProps.structuredData || "",
        focusKeywords: rootProps.focusKeywords || "",
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { data: { pageId, title: page.title, slug: page.slug, seo: seoFields } },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "set_seo",
    "Set SEO metadata for a page. Updates root props with SEO fields.",
    {
      pageId: z.string().describe("Page ID"),
      metaTitle: z.string().optional().describe("SEO meta title"),
      metaDescription: z.string().optional().describe("SEO meta description"),
      ogImage: z.string().optional().describe("Open Graph image URL"),
      ogType: z
        .enum(["website", "article", "product"])
        .optional()
        .describe("Open Graph type"),
      twitterCard: z
        .enum(["summary", "summary_large_image"])
        .optional()
        .describe("Twitter card type"),
      canonicalUrl: z.string().optional().describe("Canonical URL"),
      noIndex: z
        .enum(["true", "false"])
        .optional()
        .describe("Prevent search indexing"),
      structuredData: z.string().optional().describe("JSON-LD structured data"),
      focusKeywords: z
        .string()
        .optional()
        .describe("Focus keywords (comma-separated, max 3)"),
    },
    async ({
      pageId,
      metaTitle,
      metaDescription,
      ogImage,
      ogType,
      twitterCard,
      canonicalUrl,
      noIndex,
      structuredData,
      focusKeywords,
    }) => {
      requireAuth(server._mcpSession);
      const Page = mongoose.models.Page;

      if (!mongoose.isValidObjectId(pageId)) {
        return { content: [{ type: "text", text: "Error: invalid page ID" }], isError: true };
      }

      const page = await Page.findById(pageId);
      if (!page) {
        return { content: [{ type: "text", text: "Error: page not found" }], isError: true };
      }

      let puckData = {};
      try {
        puckData = JSON.parse(page.content || "{}");
      } catch {
        puckData = {};
      }

      if (!puckData.root) puckData.root = { props: {} };
      if (!puckData.root.props) puckData.root.props = {};

      const seoUpdate = {};
      if (metaTitle !== undefined) seoUpdate.metaTitle = metaTitle;
      if (metaDescription !== undefined) seoUpdate.metaDescription = metaDescription;
      if (ogImage !== undefined) seoUpdate.ogImage = ogImage;
      if (ogType !== undefined) seoUpdate.ogType = ogType;
      if (twitterCard !== undefined) seoUpdate.twitterCard = twitterCard;
      if (canonicalUrl !== undefined) seoUpdate.canonicalUrl = canonicalUrl;
      if (noIndex !== undefined) seoUpdate.noIndex = noIndex;
      if (structuredData !== undefined) seoUpdate.structuredData = structuredData;
      if (focusKeywords !== undefined) seoUpdate.focusKeywords = focusKeywords;

      if (Object.keys(seoUpdate).length === 0) {
        return { content: [{ type: "text", text: "Error: no SEO fields to update" }], isError: true };
      }

      Object.assign(puckData.root.props, seoUpdate);
      page.content = JSON.stringify(puckData);
      await page.save();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { data: { pageId, slug: page.slug, seoUpdated: Object.keys(seoUpdate) } },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
