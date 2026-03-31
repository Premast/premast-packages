import { Render } from "@puckeditor/core/rsc";
import { siteConfig } from "@/site.config";
import Hero from "@/components/pages/home/HeroBlock";
import Content from "@/components/pages/home/ContentBlock";

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

export async function generateMetadata() {
  try {
    const connectDB = await siteConfig.getConnectDB();
    await connectDB();
    const models = await siteConfig.getModels();
    const page = await models.Page.findOne({ slug: "home", published: true }).lean();
    if (page) {
      const puckData = parsePuckData(page.content);
      if (puckData) return extractSeoMetadata(puckData, page.title);
      return { title: page.title || "Home" };
    }
  } catch { /* DB offline */ }
  return { title: "Premast Site", description: "Built with Premast CMS" };
}

export default async function Home() {
  let page = null;
  try {
    const connectDB = await siteConfig.getConnectDB();
    await connectDB();
    const models = await siteConfig.getModels();
    page = await models.Page.findOne({ slug: "home", published: true }).lean();
  } catch {
    /* Offline DB — show fallback */
  }

  if (page) {
    const puckData = parsePuckData(page.content);
    if (puckData) {
      const finalData = await siteConfig.runBeforePageRender(puckData, page);
      const jsonLd = puckData.root?.props?.structuredData;
      return (
        <>
          {jsonLd && (
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
          )}
          <Render config={siteConfig.puckConfig} data={finalData} />
        </>
      );
    }
    return <p>{page.content || ""}</p>;
  }

  return (
    <>
      <Hero
        heading="Hero"
        lead="Welcome to the site. Edit this page in the admin under Pages to customise your home page."
        placeholderLabel="Image / video block"
        placeholderHeight={140}
      />
      <Content heading="Content" rowA="Row A" rowB="Row B" />
    </>
  );
}
