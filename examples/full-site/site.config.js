import { createSiteConfig } from "@premast/site-core";
import { baseBlocks, baseCategories } from "@/components/puck/puckConfig";
import { seoPlugin } from "@premast/site-plugin-seo";
import { uiPlugin } from "@premast/site-plugin-ui";
import { i18nPlugin } from "@premast/site-plugin-i18n";
import { mediaPlugin } from "@premast/site-plugin-media";
import { mcpPlugin } from "@premast/site-plugin-mcp";

const i18n = i18nPlugin({
  locales: ["en", "ar"],
  defaultLocale: "en",
});

export const siteConfig = createSiteConfig({
  blocks: baseBlocks,
  categories: baseCategories,
  plugins: [
    seoPlugin(),
    uiPlugin(),
    i18n,
    mediaPlugin(),
    mcpPlugin(),
  ],
  serverPlugins: async () => {
    const [
      { seoPluginServer },
      { i18nPluginServer },
      { mediaPluginServer },
      { mcpPluginServer },
    ] = await Promise.all([
      import("@premast/site-plugin-seo/server"),
      import("@premast/site-plugin-i18n/server"),
      import("@premast/site-plugin-media/server"),
      import("@premast/site-plugin-mcp/server"),
    ]);
    return [
      { name: "seo", ...seoPluginServer },
      { name: "i18n", ...i18nPluginServer(i18n.config) },
      { name: "media", ...mediaPluginServer },
      { name: "mcp", ...mcpPluginServer },
    ];
  },
});
