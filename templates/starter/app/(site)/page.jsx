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

export default async function HomePage() {
  try {
    const { Page } = siteConfig.mongooseModels;
    await siteConfig.connectDB();
    const page = await Page.findOne({ slug: "home", published: true }).lean();
    const puckData = parsePuckData(page?.content);

    if (puckData) {
      return <Render config={siteConfig.puckConfig} data={puckData} />;
    }
  } catch (err) {
    console.error("[home] Failed to load page:", err.message);
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Welcome</h1>
      <p>Create your home page in the admin panel.</p>
    </div>
  );
}
