import { SeoAdminPage } from "./admin/SeoAdminPage.jsx";

export function seoPlugin(options = {}) {
  return {
    name: "seo",
    version: "1.0.0",

    // Page-level SEO fields (appear in Puck root/page sidebar)
    rootFields: {
      metaTitle: { type: "text", label: "Meta Title" },
      metaDescription: { type: "textarea", label: "Meta Description" },
      ogImage: { type: "text", label: "OG Image URL" },
      ogType: {
        type: "select",
        label: "OG Type",
        options: [
          { label: "Website", value: "website" },
          { label: "Article", value: "article" },
          { label: "Product", value: "product" },
        ],
      },
      twitterCard: {
        type: "select",
        label: "Twitter Card",
        options: [
          { label: "Summary", value: "summary" },
          { label: "Summary Large Image", value: "summary_large_image" },
        ],
      },
      canonicalUrl: { type: "text", label: "Canonical URL" },
      noIndex: {
        type: "radio",
        label: "Search Indexing",
        options: [
          { label: "Index", value: "false" },
          { label: "No Index", value: "true" },
        ],
      },
      structuredData: { type: "textarea", label: "Structured Data (JSON-LD)" },
      focusKeywords: { type: "text", label: "Focus Keywords (comma-separated, max 3)" },
    },

    adminPages: [
      {
        key: "seo",
        label: "SEO Settings",
        icon: "SearchOutlined",
        path: "/admin/seo",
        component: SeoAdminPage,
      },
    ],
  };
}
