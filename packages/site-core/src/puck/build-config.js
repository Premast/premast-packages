export { puckFieldOverrides, DrawerItemOverride, BlockSearchOverride } from "./PuckFieldOverrides.jsx";

// Puck's built-in field types. Anything outside this set is a custom
// type name that must either (a) be registered by a plugin via
// `fieldTypes`, or (b) fall back to a plain text input so blocks that
// reference a type from a not-yet-installed plugin stay usable.
// Missing a real Puck type here silently rewrites it to `text` — most
// visibly, omitting "slot" makes every slotted block render `undefined`
// for its slot at SSR because Puck no longer injects the slot component.
const PUCK_BUILTIN_FIELD_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "select",
  "radio",
  "array",
  "object",
  "external",
  "custom",
  "slot",
]);

const _fallbackWarned = new Set();

/**
 * Resolve a single field definition. If its `type` matches a
 * registered custom type name, rewrite it to Puck's `{ type: "custom",
 * render }` shape. Unknown custom types fall back to `text` with a
 * one-time warning, so sites can declare `{ type: "media" }` in their
 * blocks without hard-depending on the media plugin. Recurses into
 * `array` items (`arrayFields`) and `object` items (`objectFields`).
 */
function resolveFieldDef(fieldDef, fieldTypes) {
  if (!fieldDef || typeof fieldDef !== "object") return fieldDef;

  let resolved = fieldDef;
  const typeName = fieldDef.type;
  if (typeName && fieldTypes[typeName]) {
    const { type: _omit, ...rest } = fieldDef;
    resolved = { ...rest, type: "custom", render: fieldTypes[typeName] };
  } else if (typeof typeName === "string" && !PUCK_BUILTIN_FIELD_TYPES.has(typeName)) {
    if (!_fallbackWarned.has(typeName)) {
      _fallbackWarned.add(typeName);
      console.warn(
        `[premast] Puck field type "${typeName}" is not registered — falling back to "text". ` +
          `Install the plugin that defines it (e.g. @premast/site-plugin-media for "media") ` +
          `or register it via a plugin's \`fieldTypes\` option.`,
      );
    }
    const { type: _omit, ...rest } = fieldDef;
    resolved = { ...rest, type: "text" };
  }

  if (resolved.type === "array" && resolved.arrayFields) {
    resolved = {
      ...resolved,
      arrayFields: resolveFieldMap(resolved.arrayFields, fieldTypes),
    };
  }
  if (resolved.type === "object" && resolved.objectFields) {
    resolved = {
      ...resolved,
      objectFields: resolveFieldMap(resolved.objectFields, fieldTypes),
    };
  }
  return resolved;
}

function resolveFieldMap(fields, fieldTypes) {
  const out = {};
  for (const [name, def] of Object.entries(fields)) {
    out[name] = resolveFieldDef(def, fieldTypes);
  }
  return out;
}

export function buildPuckConfig(
  blocks,
  categories = {},
  fieldInjections = {},
  rootFields = {},
  fieldTypes = {},
) {
  const hasFieldTypes = fieldTypes && Object.keys(fieldTypes).length > 0;

  const components = {};
  for (const [name, blockDef] of Object.entries(blocks)) {
    components[name] = { ...blockDef };
    if (fieldInjections[name]) {
      components[name].fields = {
        ...components[name].fields,
        ...fieldInjections[name],
      };
    }
    if (hasFieldTypes && components[name].fields) {
      components[name].fields = resolveFieldMap(components[name].fields, fieldTypes);
    }
  }

  const categorizedBlocks = new Set();
  const resolvedCategories = { ...categories };
  for (const cat of Object.values(resolvedCategories)) {
    if (cat.components) {
      for (const c of cat.components) categorizedBlocks.add(c);
    }
  }

  const uncategorized = Object.keys(components).filter((n) => !categorizedBlocks.has(n));
  if (uncategorized.length > 0) {
    resolvedCategories.other = {
      title: resolvedCategories.other?.title || "Other",
      components: [
        ...(resolvedCategories.other?.components || []),
        ...uncategorized,
      ],
    };
  }

  const resolvedRootFields = hasFieldTypes
    ? resolveFieldMap(rootFields, fieldTypes)
    : rootFields;
  const root = Object.keys(resolvedRootFields).length > 0 ? { fields: resolvedRootFields } : {};

  return { components, categories: resolvedCategories, root };
}
