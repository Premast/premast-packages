export { puckFieldOverrides } from "./PuckFieldOverrides.jsx";

export function buildPuckConfig(blocks, categories = {}, fieldInjections = {}, rootFields = {}) {
  const components = {};
  for (const [name, blockDef] of Object.entries(blocks)) {
    components[name] = { ...blockDef };
    if (fieldInjections[name]) {
      components[name].fields = {
        ...components[name].fields,
        ...fieldInjections[name],
      };
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

  const root = Object.keys(rootFields).length > 0 ? { fields: rootFields } : {};

  return { components, categories: resolvedCategories, root };
}
