import { validatePlugin } from "./plugin.js";
import { buildPuckConfig } from "./puck/build-config.js";
import { buildAdminSidebarItems } from "./admin/build-sidebar.js";
import { mergeAdminTokens } from "./admin/admin-theme.js";
import { buildApiRouteMap } from "./api/build-routes.js";
import { registerModels } from "./db/register-models.js";
import { createConnectDB } from "./db/mongoose.js";
import { runCoreSeed } from "./services/seed.js";

export function createSiteConfig({ blocks = {}, categories = {}, plugins = [], theme = {}, admin = {} }) {
  const validatedPlugins = plugins.map(validatePlugin);

  // Collect all blocks (base + plugin)
  const allBlocks = { ...blocks };
  for (const plugin of validatedPlugins) {
    if (plugin.blocks) Object.assign(allBlocks, plugin.blocks);
  }

  // Collect field injections
  const fieldInjections = {};
  for (const plugin of validatedPlugins) {
    if (!plugin.fields) continue;
    for (const [target, fields] of Object.entries(plugin.fields)) {
      fieldInjections[target] = { ...(fieldInjections[target] || {}), ...fields };
    }
  }

  // Collect categories
  const allCategories = { ...categories };
  for (const plugin of validatedPlugins) {
    if (plugin.categories) Object.assign(allCategories, plugin.categories);
  }

  const puckConfig = buildPuckConfig(allBlocks, allCategories, fieldInjections);
  const adminSidebarItems = buildAdminSidebarItems(validatedPlugins);
  const adminTokens = mergeAdminTokens(admin.theme);
  const adminTitle = admin.title || "CMS";
  const apiRouteHandlers = buildApiRouteMap(validatedPlugins);
  const mongooseModels = registerModels(validatedPlugins);
  const hooks = collectHooks(validatedPlugins);
  const connectDB = createConnectDB([
    { pluginName: "core", fn: runCoreSeed },
    ...hooks.afterDbConnect,
  ]);

  return {
    puckConfig,
    adminSidebarItems,
    adminTokens,
    adminTitle,
    apiRouteHandlers,
    mongooseModels,
    hooks,
    connectDB,
    plugins: validatedPlugins,
    theme,
  };
}

function collectHooks(plugins) {
  const hookMap = {
    afterPageSave: [],
    afterDbConnect: [],
    beforePageRender: [],
  };
  for (const plugin of plugins) {
    if (!plugin.hooks) continue;
    for (const [name, fn] of Object.entries(plugin.hooks)) {
      if (hookMap[name] && typeof fn === "function") {
        hookMap[name].push({ pluginName: plugin.name, fn });
      }
    }
  }
  return hookMap;
}
