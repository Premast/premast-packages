import mongoose from "mongoose";
import { sitemapHandler, robotsHandler } from "./handlers/seo-handlers.js";

const seoMetaSchema = new mongoose.Schema(
  {
    pageId: { type: mongoose.Schema.Types.ObjectId, ref: "Page", unique: true },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    ogImage: { type: String, default: "" },
    ogType: { type: String, default: "website" },
    twitterCard: { type: String, default: "summary" },
    canonicalUrl: { type: String, default: "" },
    noIndex: { type: Boolean, default: false },
    structuredData: { type: String, default: "" },
  },
  { timestamps: true },
);

/**
 * Server-only SEO plugin extensions.
 * Merge this into the plugin object on the server side (e.g. in site.config.js
 * via createSiteConfig's server init).
 */
export const seoPluginServer = {
  apiRoutes: [
    { path: "seo/sitemap", method: "GET", handler: sitemapHandler },
    { path: "seo/robots", method: "GET", handler: robotsHandler },
  ],

  models: {
    SeoMeta: seoMetaSchema,
  },

  hooks: {
    afterDbConnect: async () => {
      // plugin ready
    },
  },
};
