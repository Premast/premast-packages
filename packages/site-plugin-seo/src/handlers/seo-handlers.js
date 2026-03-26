export async function sitemapHandler(request, _params, { connectDB }) {
  await connectDB();
  const mongoose = (await import("mongoose")).default;
  const Page = mongoose.models.Page;
  if (!Page) {
    return new Response("<!-- No Page model registered -->", {
      headers: { "Content-Type": "application/xml" },
    });
  }

  const pages = await Page.find({ published: true }).select("slug updatedAt").lean();
  const origin = new URL(request.url).origin;

  const urls = pages.map((p) => {
    const loc = p.slug === "home" ? origin : `${origin}/${p.slug}`;
    const lastmod = p.updatedAt ? new Date(p.updatedAt).toISOString() : "";
    return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");

  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}

export async function robotsHandler(request) {
  const origin = new URL(request.url).origin;
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${origin}/api/seo/sitemap`,
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
