import { validatePlugin } from "./plugin.js";
import { buildPuckConfig } from "./puck/build-config.js";
import { buildAdminSidebarItems } from "./admin/build-sidebar.js";
import { mergeAdminTokens } from "./admin/admin-theme.js";

export function createSiteConfig({ blocks = {}, categories = {}, plugins = [], serverPlugins, theme = {}, admin = {} }) {
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

  // Collect root fields (page-level fields from plugins)
  const rootFields = {};
  for (const plugin of validatedPlugins) {
    if (plugin.rootFields) Object.assign(rootFields, plugin.rootFields);
  }

  const puckConfig = buildPuckConfig(allBlocks, allCategories, fieldInjections, rootFields);
  const adminSidebarItems = buildAdminSidebarItems(validatedPlugins);
  const adminTokens = mergeAdminTokens(admin.theme);
  const adminTitle = admin.title || "CMS";
  const adminFooter = admin.footer ?? "Developed by Premastlab";
  const hooks = collectHooks(validatedPlugins);

  // Resolve server-side plugin extensions (models, apiRoutes, hooks)
  // serverPlugins is an async function that returns plugin objects with server-only properties
  let _serverPluginsCache;
  async function resolveServerPlugins() {
    if (_serverPluginsCache) return _serverPluginsCache;
    const serverExts = serverPlugins ? await serverPlugins() : [];
    // Merge server extensions into validated plugins by name
    const merged = validatedPlugins.map((p) => {
      const ext = serverExts.find((s) => s.name === p.name);
      return ext ? { ...p, ...ext, name: p.name } : p;
    });
    // Include any server-only plugins not in the client list
    for (const ext of serverExts) {
      if (!validatedPlugins.find((p) => p.name === ext.name)) {
        merged.push(ext);
      }
    }
    _serverPluginsCache = merged;
    return merged;
  }

  // Server-only: lazy async initializers to avoid bundling mongoose on the client
  async function getModels() {
    const allPlugins = await resolveServerPlugins();
    const { registerModels } = await import("./db/register-models.js");
    return registerModels(allPlugins);
  }

  async function getApiRouteHandlers() {
    const allPlugins = await resolveServerPlugins();
    const { buildApiRouteMap } = await import("./api/build-routes.js");
    return buildApiRouteMap(allPlugins);
  }

  async function getConnectDB() {
    const allPlugins = await resolveServerPlugins();
    const serverHooks = collectHooks(allPlugins);
    const { createConnectDB } = await import("./db/mongoose.js");
    const { runCoreSeed } = await import("./services/seed.js");
    return createConnectDB([
      { pluginName: "core", fn: runCoreSeed },
      ...serverHooks.afterDbConnect,
    ]);
  }

  return {
    puckConfig,
    adminSidebarItems,
    adminTokens,
    adminTitle,
    adminFooter,
    getApiRouteHandlers,
    getModels,
    getConnectDB,
    hooks,
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
