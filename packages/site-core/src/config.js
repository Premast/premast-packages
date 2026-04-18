import { validatePlugin } from "./plugin.js";
import { buildPuckConfig } from "./puck/build-config.js";
import { buildAdminSidebarItems } from "./admin/build-sidebar.js";
import { mergeAdminTokens } from "./admin/admin-theme.js";
import {
  autoRedirectAfterPageSave,
  autoRedirectAfterContentItemSave,
} from "./services/auto-redirect.js";

export function createSiteConfig({ blocks = {}, categories = {}, plugins = [], serverPlugins, theme = {}, admin = {} }) {
  const validatedPlugins = plugins.map(validatePlugin);

  // Check for duplicate plugin names
  const pluginNames = new Set();
  for (const plugin of validatedPlugins) {
    if (pluginNames.has(plugin.name)) {
      throw new Error(`Duplicate plugin name "${plugin.name}". Each plugin must have a unique name.`);
    }
    pluginNames.add(plugin.name);
  }

  // Check for duplicate admin page keys
  const adminPageKeys = new Set();
  for (const plugin of validatedPlugins) {
    if (!plugin.adminPages) continue;
    for (const page of plugin.adminPages) {
      const key = page.path || `/admin/${page.key}`;
      if (adminPageKeys.has(key)) {
        throw new Error(`Plugin "${plugin.name}" registers admin page "${key}" which conflicts with another plugin.`);
      }
      adminPageKeys.add(key);
    }
  }

  // Check for duplicate API routes
  const apiRouteKeys = new Set();
  for (const plugin of validatedPlugins) {
    if (!plugin.apiRoutes) continue;
    for (const route of plugin.apiRoutes) {
      const key = `${route.method.toUpperCase()} /api/${route.path}`;
      if (apiRouteKeys.has(key)) {
        throw new Error(`Plugin "${plugin.name}" registers API route "${key}" which conflicts with another plugin.`);
      }
      apiRouteKeys.add(key);
    }
  }

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

  // Collect custom Puck field types registered by plugins. Blocks can
  // reference these by name (e.g. `{ type: "media" }`) and the config
  // builder rewrites them to `{ type: "custom", render }` shape.
  const fieldTypes = {};
  for (const plugin of validatedPlugins) {
    if (!plugin.fieldTypes) continue;
    for (const [typeName, component] of Object.entries(plugin.fieldTypes)) {
      if (fieldTypes[typeName]) {
        console.warn(
          `[premast] Plugin "${plugin.name}" registers field type "${typeName}" which conflicts with another plugin. The later plugin will take precedence.`,
        );
      }
      fieldTypes[typeName] = component;
    }
  }

  const puckConfig = buildPuckConfig(allBlocks, allCategories, fieldInjections, rootFields, fieldTypes);
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

  async function getHooks() {
    const allPlugins = await resolveServerPlugins();
    return collectHooks(allPlugins);
  }

  /**
   * Run beforePageRender hooks — lets plugins transform Puck data before render.
   * Returns the (possibly transformed) puckData.
   */
  async function runBeforePageRender(puckData, page) {
    const resolvedHooks = await getHooks();
    let data = puckData;
    for (const { pluginName, fn } of resolvedHooks.beforePageRender) {
      try {
        const result = await fn({ data, page });
        if (result && typeof result === "object" && Array.isArray(result.content)) {
          data = result;
        }
      } catch (e) {
        console.error(`[premast] beforePageRender hook from "${pluginName}" failed:`, e);
      }
    }
    return data;
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
    getHooks,
    runBeforePageRender,
    hooks,
    plugins: validatedPlugins,
    theme,
  };
}

function collectHooks(plugins) {
  const hookMap = {
    beforePageSave: [],
    afterPageSave: [],
    beforeGlobalSave: [],
    afterGlobalSave: [],
    beforeContentItemSave: [],
    afterContentItemSave: [],
    afterDbConnect: [],
    beforePageRender: [],
  };
  // Built-in core hooks. These run before any plugin hooks and ship
  // with every site — no opt-in. The auto-redirect hook listens for
  // slug changes on Pages and ContentItems and writes 301 redirects
  // into the Redirect collection.
  hookMap.afterPageSave.push({
    pluginName: "core:auto-redirect",
    fn: autoRedirectAfterPageSave,
  });
  hookMap.afterContentItemSave.push({
    pluginName: "core:auto-redirect",
    fn: autoRedirectAfterContentItemSave,
  });
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

/**
 * Run beforeGlobalSave hooks. Same shape as runBeforePageSave —
 * receives `{ data, action, key }` and returns the (possibly mutated)
 * data object.
 */
export async function runBeforeGlobalSave(hooks, data, action, key) {
  if (!hooks?.beforeGlobalSave?.length) return data;
  let result = data;
  for (const { pluginName, fn } of hooks.beforeGlobalSave) {
    try {
      const out = await fn({ data: result, action, key });
      if (out && typeof out === "object") result = out;
    } catch (e) {
      console.error(`[premast] beforeGlobalSave hook from "${pluginName}" failed:`, e);
    }
  }
  return result;
}

/**
 * Run beforePageSave hooks. Each hook receives `{ data, action }`
 * and should return the (possibly mutated) data object. Errors are
 * logged but do not abort the save.
 *
 * Exported so API handlers can call it without re-deriving the hook
 * collection from a config instance.
 */
export async function runBeforePageSave(hooks, data, action, oldDoc = null) {
  if (!hooks?.beforePageSave?.length) return data;
  let result = data;
  for (const { pluginName, fn } of hooks.beforePageSave) {
    try {
      // oldDoc is additive; existing hooks that destructure only
      // { data, action } continue to work without changes.
      const out = await fn({ data: result, action, oldDoc });
      if (out && typeof out === "object") result = out;
    } catch (e) {
      console.error(`[premast] beforePageSave hook from "${pluginName}" failed:`, e);
    }
  }
  return result;
}

/**
 * Run beforeContentItemSave hooks. Same shape as runBeforePageSave —
 * receives `{ data, action, contentType }` and returns the (possibly
 * mutated) data object.
 *
 * The optional `contentType` is the ContentType id the item belongs
 * to, which lets locale-aware hooks scope translationGroupId lookups
 * by type when needed.
 */
export async function runBeforeContentItemSave(
  hooks,
  data,
  action,
  contentType,
  oldDoc = null,
) {
  if (!hooks?.beforeContentItemSave?.length) return data;
  let result = data;
  for (const { pluginName, fn } of hooks.beforeContentItemSave) {
    try {
      // oldDoc is additive; existing hooks that destructure only the
      // earlier fields keep working.
      const out = await fn({ data: result, action, contentType, oldDoc });
      if (out && typeof out === "object") result = out;
    } catch (e) {
      console.error(`[premast] beforeContentItemSave hook from "${pluginName}" failed:`, e);
    }
  }
  return result;
}
