/**
 * Client-safe Puck config. Import this in "use client" components
 * (editors) instead of site.config.js to avoid pulling mongoose
 * into the browser bundle.
 *
 * Must mirror the blocks/categories/plugins registered in site.config.js.
 */
import { baseBlocks, baseCategories } from "@premast/site-blocks";
import { seoPlugin } from "@premast/site-plugin-seo";
import { SeoScoreField } from "@/components/seo/SeoScoreField";
import { SearchIndexingField } from "@/components/seo/SearchIndexingField";
import { buildPuckConfig } from "@premast/site-core/puck";

const seo = seoPlugin();

const rootFields = {
  ...seo.rootFields,
  noIndex: {
    type: "custom",
    label: "Search Indexing",
    render: SearchIndexingField,
  },
  seoScore: {
    type: "custom",
    label: "SEO Score",
    render: SeoScoreField,
  },
};

export const puckConfig = buildPuckConfig(baseBlocks, baseCategories, {}, rootFields);
