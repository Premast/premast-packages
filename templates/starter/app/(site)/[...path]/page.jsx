import { Render } from "@puckeditor/core/rsc";
import { siteConfig } from "@/site.config";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePuckData(content) {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.content)) {
      return parsed;
    }
  } catch { /* not valid Puck JSON */ }
  return null;
}

function extractSeoMetadata(puckData, fallbackTitle) {
  const root = puckData?.root?.props || {};
  const meta = { title: root.metaTitle || fallbackTitle || "Premast Site" };
  if (root.metaDescription) meta.description = root.metaDescription;
  if (root.noIndex === "true" || root.noIndex === true) {
    meta.robots = { index: false, follow: false };
  }
  if (root.canonicalUrl) meta.alternates = { canonical: root.canonicalUrl };

  const openGraph = {};
  if (root.metaTitle) openGraph.title = root.metaTitle;
  if (root.metaDescription) openGraph.description = root.metaDescription;
  if (root.ogImage) openGraph.images = [{ url: root.ogImage }];
  if (root.ogType) openGraph.type = root.ogType;
  if (Object.keys(openGraph).length > 0) meta.openGraph = openGraph;

  if (root.twitterCard) {
    meta.twitter = { card: root.twitterCard };
    if (root.metaTitle) meta.twitter.title = root.metaTitle;
    if (root.metaDescription) meta.twitter.description = root.metaDescription;
    if (root.ogImage) meta.twitter.images = [root.ogImage];
  }
  return meta;
}

/** Resolve a path to either a ContentItem or a standalone Page. */
async function resolveContent(pathSegments) {
  const connectDB = await siteConfig.getConnectDB();
  await connectDB();
  const models = await siteConfig.getModels();
  const { ContentType, ContentItem, Page } = models;

  for (let i = pathSegments.length - 1; i >= 1; i--) {
    const prefix = "/" + pathSegments.slice(0, i).join("/");
    const slug = pathSegments[i];
    const ct = await ContentType.findOne({ urlPrefix: prefix }).lean();
    if (ct) {
      const item = await ContentItem.findOne({ contentType: ct._id, slug, published: true }).lean();
      return item || null;
    }
  }
  if (pathSegments.length === 1) {
    return Page.findOne({ slug: pathSegments[0], published: true }).lean();
  }
  return null;
}

export async function generateMetadata({ params }) {
  const { path } = await params;
  if (!path || path.length === 0) return {};
  try {
    const doc = await resolveContent(path);
    if (doc) {
      const puckData = parsePuckData(doc.content);
      if (puckData) return extractSeoMetadata(puckData, doc.title);
      return { title: doc.title };
    }
  } catch { /* DB offline */ }
  return {};
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

        const finalData = await siteConfig.runBeforePageRender(puckData, item);
        return (
          <article>
            <Render config={siteConfig.puckConfig} data={finalData} />
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

        const finalData = await siteConfig.runBeforePageRender(puckData, page);
        return (
          <article>
            <Render config={siteConfig.puckConfig} data={finalData} />
          </article>
        );
      }
    }

    return notFound();
  } catch {
    return notFound();
  }
}
