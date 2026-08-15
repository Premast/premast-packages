import { SYMBOL_REF_PREFIX } from "../constants.js";

/** `SymbolRef_<id>` → `<id>`, or null if not a generated reference type. */
export function symbolIdFromType(type) {
  if (typeof type !== "string" || !type.startsWith(SYMBOL_REF_PREFIX)) return null;
  const id = type.slice(SYMBOL_REF_PREFIX.length);
  return id || null;
}

export function typeForSymbolId(id) {
  return `${SYMBOL_REF_PREFIX}${id}`;
}

/**
 * Augment a Puck config with one component type per published symbol, so
 * every reusable component shows up as its own draggable entry in the
 * Blocks palette (like Webflow's Components panel) instead of a single
 * generic block plus a dropdown.
 *
 * Each generated type carries its `symbolId` in `defaultProps`, which is
 * what lets a plain drag-and-drop produce a fully-configured reference —
 * Puck inserts components by type, so the type is the only place the
 * chosen component can come from.
 *
 * The generic `SymbolBlock` stays registered: pages saved before this
 * existed still use it, and it remains a working escape hatch.
 *
 * The renderers are injected rather than imported so this module stays
 * free of JSX and can be unit-tested in plain node:
 *   - `renderPreview(props)` — the on-canvas block
 *   - `renderInfo(symbol)`   — the sidebar panel for the selected block
 */
export function withSymbolComponents(puckConfig, symbols, renderers = {}) {
  const { renderPreview, renderInfo } = renderers;
  if (!puckConfig || !Array.isArray(symbols) || symbols.length === 0) {
    return puckConfig;
  }

  const components = { ...puckConfig.components };
  const generatedTypes = [];

  for (const symbol of symbols) {
    if (!symbol?._id) continue;
    const type = typeForSymbolId(symbol._id);
    generatedTypes.push(type);
    components[type] = {
      label: symbol.name || symbol.slug || "Component",
      // No *editable* props: which component this is *is* the type.
      // Swapping means deleting and dragging a different one, same as
      // Webflow. The one field is a read-only info panel, so selecting the
      // block doesn't present an empty properties sidebar.
      fields: renderInfo
        ? {
            component: {
              type: "custom",
              key: type,
              render: () => renderInfo(symbol),
            },
          }
        : {},
      defaultProps: { symbolId: String(symbol._id) },
      render: renderPreview,
    };
  }

  if (generatedTypes.length === 0) return puckConfig;

  // Surface them under their own palette category, above "Other".
  const categories = { ...puckConfig.categories };
  const existing = categories.components?.components || [];
  categories.components = {
    ...categories.components,
    title: categories.components?.title || "Components",
    components: [...existing, ...generatedTypes],
  };

  return { ...puckConfig, components, categories };
}
