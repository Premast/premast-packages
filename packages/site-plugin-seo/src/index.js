import mongoose from "mongoose";
import { SeoHeadBlock } from "./blocks/SeoHeadBlock.jsx";
import { SeoAdminPage } from "./admin/SeoAdminPage.jsx";
import { sitemapHandler, robotsHandler } from "./handlers/seo-handlers.js";

const seoMetaSchema = new mongoose.Schema(
  {
    pageId: { type: mongoose.Schema.Types.ObjectId, ref: "Page", unique: true },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    ogImage: { type: String, default: "" },
    noIndex: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export function seoPlugin(options = {}) {
  return {
    name: "seo",
    version: "1.0.0",

    blocks: {
      SeoHeadBlock,
    },

    categories: {
      seo: {
        title: "SEO",
        components: ["SeoHeadBlock"],
      },
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

    apiRoutes: [
      { path: "seo/sitemap", method: "GET", handler: sitemapHandler },
      { path: "seo/robots", method: "GET", handler: robotsHandler },
    ],

    models: {
      SeoMeta: seoMetaSchema,
    },

    hooks: {
      afterDbConnect: async () => {
        console.log("[seo-plugin] initialized");
      },
    },
  };
}
