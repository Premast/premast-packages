/**
 * Client-safe Puck config. Import this in "use client" components
 * (editors) instead of site.config.js to avoid pulling mongoose into
 * the browser bundle.
 *
 * This file is the E2E harness counterpart of templates/starter/puck.config.js.
 * Every plugin listed here must also be wired into site.config.js.
 */
import { baseBlocks, baseCategories } from "@/components/puck/puckConfig";
import { seoPlugin } from "@premast/site-plugin-seo";
import { uiPlugin } from "@premast/site-plugin-ui";
import { i18nPlugin } from "@premast/site-plugin-i18n";
import { mediaPlugin } from "@premast/site-plugin-media";
import { mcpPlugin } from "@premast/site-plugin-mcp";
import { SeoScoreField, SearchIndexingField } from "@premast/site-plugin-seo/editor";
import { buildPuckConfig } from "@premast/site-core/puck";

const plugins = [
  seoPlugin(),
  uiPlugin(),
  i18nPlugin({ locales: ["en", "ar"], defaultLocale: "en" }),
  mediaPlugin(),
  mcpPlugin(),
];

const rootFields = {};
for (const plugin of plugins) {
  if (plugin.rootFields) Object.assign(rootFields, plugin.rootFields);
}

const allBlocks = { ...baseBlocks };
for (const plugin of plugins) {
  if (plugin.blocks) Object.assign(allBlocks, plugin.blocks);
}

const allCategories = { ...baseCategories };
for (const plugin of plugins) {
  if (plugin.categories) Object.assign(allCategories, plugin.categories);
}

const fieldTypes = {};
for (const plugin of plugins) {
  if (plugin.fieldTypes) Object.assign(fieldTypes, plugin.fieldTypes);
}

rootFields.noIndex = {
  type: "custom",
  label: "Search Indexing",
  render: SearchIndexingField,
};
rootFields.seoScore = {
  type: "custom",
  label: "SEO Score",
  render: SeoScoreField,
};

export const puckConfig = buildPuckConfig(allBlocks, allCategories, {}, rootFields, fieldTypes);
