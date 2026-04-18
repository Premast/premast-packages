import { siteConfig } from "@/site.config";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const connectDB = await siteConfig.getConnectDB();
  await connectDB();
  const models = await siteConfig.getModels();
  const { Page, ContentType, ContentItem } = models;

  const baseUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";

  const entries = [];

  // Home page
  entries.push({ url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1.0 });

  // Standalone pages
  const pages = await Page.find({ published: true }, { slug: 1, updatedAt: 1 }).lean();
  for (const page of pages) {
    entries.push({
      url: `${baseUrl}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Content items (blog posts, services, etc.)
  const contentTypes = await ContentType.find({}, { _id: 1, urlPrefix: 1 }).lean();
  const ctMap = Object.fromEntries(contentTypes.map((ct) => [ct._id.toString(), ct.urlPrefix]));

  const items = await ContentItem.find(
    { published: true },
    { slug: 1, contentType: 1, updatedAt: 1 },
  ).lean();

  for (const item of items) {
    const prefix = ctMap[item.contentType.toString()];
    if (!prefix) continue;
    entries.push({
      url: `${baseUrl}${prefix}/${item.slug}`,
      lastModified: item.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
