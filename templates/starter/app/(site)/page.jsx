import { Render } from "@puckeditor/core/rsc";
import { siteConfig } from "@/site.config";
import { LoFiPanel, LoFiPlaceholder } from "@/components/ui";
import styles from "./page.module.css";

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

/** Extract SEO metadata from Puck root fields. */
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
    const { Page } = models;
    page = await Page.findOne({ slug: "home", published: true }).lean();
  } catch {
    /* Offline DB or bad credentials — show fallback below */
  }

  if (page) {
    const puckData = parsePuckData(page.content);

    if (puckData) {
      return (
        <div className={styles.page}>
          <Render config={siteConfig.puckConfig} data={puckData} />
        </div>
      );
    }

    /* Legacy plain-text content fallback */
    return (
      <div className={styles.page}>
        <LoFiPanel title={page.title}>
          <p className={styles.body}>{page.content || ""}</p>
        </LoFiPanel>
      </div>
    );
  }

  /* No published home page — show placeholder */
  return (
    <div className={styles.page}>
      <LoFiPanel title="Hero">
        <p className={styles.lead}>
          No published home page (slug <code style={{ fontSize: "0.85em" }}>home</code>
          ) yet. After a successful DB connection, a default home page is created
          automatically; publish it from the admin if needed.
        </p>
        <LoFiPlaceholder height={140} label="Image / video block" />
      </LoFiPanel>

      <LoFiPanel title="Content">
        <div className={styles.stack}>
          <LoFiPlaceholder height={56} label="Row A" />
          <LoFiPlaceholder height={56} label="Row B" />
        </div>
      </LoFiPanel>
    </div>
  );
}
