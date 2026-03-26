/**
 * Plugin interface for @premast/site-core.
 *
 * A plugin is a plain object (usually returned by a factory function):
 * {
 *   name: string (required, unique),
 *   version?: string,
 *   blocks?: { [componentName]: PuckBlockDefinition },
 *   fields?: { [targetBlock]: { [fieldName]: PuckFieldDefinition } },
 *   categories?: { [categoryName]: { title, components[] } },
 *   adminPages?: [{ key, label, icon, path, component }],
 *   apiRoutes?: [{ path, method, handler }],
 *   models?: { [ModelName]: MongooseSchema },
 *   hooks?: { afterDbConnect?, afterPageSave?, beforePageRender? },
 *   seedData?: function,
 * }
 */
export function validatePlugin(plugin) {
  if (!plugin || typeof plugin !== "object") {
    throw new Error("Plugin must be an object");
  }
  if (!plugin.name || typeof plugin.name !== "string") {
    throw new Error("Plugin must have a 'name' string");
  }
  if (plugin.blocks && typeof plugin.blocks !== "object") {
    throw new Error(`Plugin "${plugin.name}": blocks must be an object`);
  }
  if (plugin.fields && typeof plugin.fields !== "object") {
    throw new Error(`Plugin "${plugin.name}": fields must be an object`);
  }
  if (plugin.adminPages && !Array.isArray(plugin.adminPages)) {
    throw new Error(`Plugin "${plugin.name}": adminPages must be an array`);
  }
  if (plugin.apiRoutes && !Array.isArray(plugin.apiRoutes)) {
    throw new Error(`Plugin "${plugin.name}": apiRoutes must be an array`);
  }
  if (plugin.models && typeof plugin.models !== "object") {
    throw new Error(`Plugin "${plugin.name}": models must be an object`);
  }
  if (plugin.hooks && typeof plugin.hooks !== "object") {
    throw new Error(`Plugin "${plugin.name}": hooks must be an object`);
  }
  return plugin;
}
