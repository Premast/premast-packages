import { Render } from "@puckeditor/core/rsc";
import { siteConfig } from "@/site.config";

export const dynamic = "force-dynamic";

function parsePuckData(raw) {
  if (!raw) return null;
  try {
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data?.content && Array.isArray(data.content)) return data;
  } catch {}
  return null;
}

export default async function SiteLayout({ children }) {
  let headerData = null;
  let footerData = null;

  try {
    const { Global } = siteConfig.mongooseModels;
    await siteConfig.connectDB();
    const [headerDoc, footerDoc] = await Promise.all([
      Global.findOne({ key: "header", published: true }).lean(),
      Global.findOne({ key: "footer", published: true }).lean(),
    ]);
    headerData = parsePuckData(headerDoc?.content);
    footerData = parsePuckData(footerDoc?.content);
  } catch (err) {
    console.error("[site-layout] Failed to load globals:", err.message);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {headerData ? (
        <Render config={siteConfig.puckConfig} data={headerData} />
      ) : (
        <header style={{ padding: "1rem", borderBottom: "1px solid var(--theme-border)" }}>
          Site Header
        </header>
      )}
      <main style={{ flex: 1 }}>{children}</main>
      {footerData ? (
        <Render config={siteConfig.puckConfig} data={footerData} />
      ) : (
        <footer style={{ padding: "1rem", borderTop: "1px solid var(--theme-border)" }}>
          Site Footer
        </footer>
      )}
    </div>
  );
}
