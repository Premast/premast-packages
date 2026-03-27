import { Render } from "@puckeditor/core/rsc";
import { siteConfig } from "@/site.config";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generic catch-all route for content items.
 *
 * Matches any URL like /<urlPrefix>/<slug> where urlPrefix is registered
 * in a ContentType.  For example if a ContentType has urlPrefix "/blog",
 * the URL /blog/my-article resolves to the ContentItem with slug "my-article"
 * under that ContentType.
 *
 * Also handles standalone Pages (urlPrefix-less) at /<slug>.
 */

function parsePuckData(content) {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.content)) {
      return parsed;
    }
  } catch {
    /* not valid Puck JSON */
  }
  return null;
}

export default async function ContentCatchAllPage({ params }) {
  const { path } = await params;

  // path is an array of URL segments, e.g. ["blog", "my-article"]
  if (!path || path.length === 0) return notFound();

  try {
    const connectDB = await siteConfig.getConnectDB();
    await connectDB();
    const models = await siteConfig.getModels();
    const { ContentType, ContentItem, Page } = models;

    // --- Try content type match first ---
    // Build candidate prefixes from longest to shortest
    // e.g. path=["products","featured","item-1"] tries:
    //   /products/featured  (slug = "item-1")
    //   /products           (slug = "featured")
    for (let i = path.length - 1; i >= 1; i--) {
      const prefix = "/" + path.slice(0, i).join("/");
      const slug = path[i];

      const contentType = await ContentType.findOne({
        urlPrefix: prefix,
      }).lean();

      if (contentType) {
        const item = await ContentItem.findOne({
          contentType: contentType._id,
          slug,
          published: true,
        }).lean();

        if (!item) return notFound();

        const puckData = parsePuckData(item.content);
        if (!puckData) return notFound();

        return (
          <article>
            <Render config={siteConfig.puckConfig} data={puckData} />
          </article>
        );
      }
    }

    // --- Fallback: standalone Page by slug ---
    // Only for single-segment paths like /about, /contact
    if (path.length === 1) {
      const page = await Page.findOne({
        slug: path[0],
        published: true,
      }).lean();

      if (page) {
        const puckData = parsePuckData(page.content);
        if (!puckData) return notFound();

        return (
          <article>
            <Render config={siteConfig.puckConfig} data={puckData} />
          </article>
        );
      }
    }

    return notFound();
  } catch {
    return notFound();
  }
}
