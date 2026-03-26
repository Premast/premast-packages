import { createSiteConfig } from "@premast/site-core";
import { baseBlocks, baseCategories } from "@premast/site-blocks";
import { seoPlugin } from "@premast/site-plugin-seo";

export const siteConfig = createSiteConfig({
  blocks: baseBlocks,
  categories: baseCategories,
  plugins: [
    seoPlugin(),
  ],
});
