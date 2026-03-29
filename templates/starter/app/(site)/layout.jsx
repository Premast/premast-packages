import { Render } from "@puckeditor/core/rsc";
import { siteConfig } from "@/site.config";
import Header from "@/components/layout/HeaderBlock";
import Footer from "@/components/layout/FooterBlock";
import styles from "../layout.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export default async function SiteLayout({ children }) {
  let headerData = null;
  let footerData = null;

  try {
    const connectDB = await siteConfig.getConnectDB();
    await connectDB();
    const models = await siteConfig.getModels();
    const { Global } = models;
    const [headerDoc, footerDoc] = await Promise.all([
      Global.findOne({ key: "header", published: true }).lean(),
      Global.findOne({ key: "footer", published: true }).lean(),
    ]);
    headerData = parsePuckData(headerDoc?.content);
    footerData = parsePuckData(footerDoc?.content);
  } catch {
    /* DB offline — fallback to static components */
  }

  return (
    <div className={styles.shell}>
      {headerData ? <Render config={siteConfig.puckConfig} data={headerData} /> : <Header />}
      <main className={styles.main}>{children}</main>
      {footerData ? <Render config={siteConfig.puckConfig} data={footerData} /> : <Footer />}
    </div>
  );
}
