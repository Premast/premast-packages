import { SYMBOL_BLOCK_TYPE, SYMBOL_REF_PREFIX } from "../constants.js";

/** The generic block and every palette-generated per-symbol type. */
function isSymbolType(type) {
  return type === SYMBOL_BLOCK_TYPE || type.startsWith(SYMBOL_REF_PREFIX);
}

/**
 * Derive a component-scoped Puck config from the site's page config.
 *
 * A component is a reusable *fragment*, not a page, so two things in
 * the page config don't belong here:
 *
 *  1. Root fields — SEO meta, canonical URL, structured data, language,
 *     etc. are injected by plugins as page-level fields. A fragment has
 *     no URL and no <head>, so they'd be dead data saved into the
 *     component blob. We drop `root.fields` but keep anything else on
 *     `root` (e.g. a custom root render/wrapper).
 *
 *  2. The Component block itself — nesting a reference inside a
 *     component would not expand at render (the expansion hook inlines
 *     a symbol's content as-is, so a nested reference would silently
 *     render nothing). Removing it from the palette makes that
 *     impossible rather than a footgun.
 *
 * Returns a new config; the input is not mutated.
 */
export function buildComponentPuckConfig(puckConfig) {
  if (!puckConfig) return puckConfig;

  const { fields: _pageRootFields, ...rootRest } = puckConfig.root || {};

  const components = {};
  for (const [type, def] of Object.entries(puckConfig.components || {})) {
    if (!isSymbolType(type)) components[type] = def;
  }

  const categories = {};
  for (const [key, cat] of Object.entries(puckConfig.categories || {})) {
    if (!cat?.components) {
      categories[key] = cat;
      continue;
    }
    const remaining = cat.components.filter((c) => !isSymbolType(c));
    // Drop categories that existed only to hold the Component block.
    if (remaining.length === 0) continue;
    categories[key] = { ...cat, components: remaining };
  }

  return { ...puckConfig, components, categories, root: rootRest };
}
