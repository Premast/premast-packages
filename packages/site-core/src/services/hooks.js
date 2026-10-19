import {
  autoRedirectAfterPageSave,
  autoRedirectAfterContentItemSave,
} from "./auto-redirect.js";

/**
 * Lifecycle hook collection and the beforeXSave runners.
 *
 * Kept out of config.js, which imports the admin's JSX components, so
 * plain Node (the MCP plugin's stdio server) can load the save path —
 * see content-save.js.
 */

/**
 * Build the hook map for a set of plugins. The built-in core hooks
 * come first; `collectHooks([])` is the map for a process that runs
 * without the site's plugins.
 */
export function collectHooks(plugins) {
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
