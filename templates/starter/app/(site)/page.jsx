import { Render } from "@puckeditor/core/rsc";
import { siteConfig } from "@/site.config";
import { LoFiPanel, LoFiPlaceholder } from "@/components/ui";
import styles from "./page.module.css";

export const runtime = "nodejs";
/** Avoid DB access during `next build` / static prerender; render on each request. */
export const dynamic = "force-dynamic";

/** Try to parse Puck JSON from page.content; returns null if not valid Puck data. */
function parsePuckData(content) {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.content)) {
      return parsed;
    }
  } catch {
    /* not JSON — legacy plain text */
  }
  return null;
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
