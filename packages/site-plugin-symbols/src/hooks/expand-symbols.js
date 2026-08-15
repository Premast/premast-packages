import mongoose from "mongoose";
import { getSymbolModel } from "../models/Symbol.js";
import { SYMBOL_BLOCK_TYPE, SYMBOL_REF_PREFIX } from "../constants.js";

/**
 * Both reference shapes resolve to a symbol id:
 *  - the generic block: `{ type: "SymbolBlock", props: { symbolId } }`
 *  - a palette-generated type: `{ type: "SymbolRef_<id>", props: {…} }`
 * The generated type carries the id in `defaultProps.symbolId` too, but
 * we prefer the type so a reference stays correct even if props are lost.
 */
function referencedSymbolId(item) {
  const type = item?.type;
  if (typeof type === "string" && type.startsWith(SYMBOL_REF_PREFIX)) {
    return type.slice(SYMBOL_REF_PREFIX.length) || null;
  }
  if (type === SYMBOL_BLOCK_TYPE) return item?.props?.symbolId || null;
  return null;
}

function isSymbolReference(item) {
  return referencedSymbolId(item) !== null;
}

/**
 * True if `value` is a slot: an array of Puck items. Puck stores `type:
 * "slot"` field values inline on props, so a component dropped into a
 * Flex/Grid/Col lives here rather than at the top level.
 */
function isSlotArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((e) => e && typeof e === "object" && "type" in e && "props" in e)
  );
}

/**
 * Cheap pre-flight scan: does this tree reference a symbol anywhere —
 * top level, inside a slot, or in a legacy zone? Lets the common case
 * (no components on the page) skip the walk and return `data` untouched.
 */
function containsSymbolReference(items) {
  for (const item of items || []) {
    if (isSymbolReference(item)) return true;
    for (const value of Object.values(item?.props || {})) {
      if (isSlotArray(value) && containsSymbolReference(value)) return true;
    }
  }
  return false;
}

/**
 * Recursively prefix every Puck item id in a subtree so the same symbol
 * used twice on a page can't collide. Handles inline slot fields (array
 * props whose entries are Puck items — the @puckeditor/core `slot`
 * shape) by recursing into them.
 */
function namespaceItem(item, prefix) {
  if (!item || typeof item !== "object") return item;
  const props = { ...(item.props || {}) };
  if (props.id) props.id = `${prefix}::${props.id}`;
  for (const [key, value] of Object.entries(props)) {
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((e) => e && typeof e === "object" && "type" in e && "props" in e)
    ) {
      props[key] = value.map((child) => namespaceItem(child, prefix));
    }
  }
  return { ...item, props };
}

/**
 * Split a legacy Puck zone key "parentId:zoneName" into its parts.
 * Zone keys use the LAST colon as the separator (ids don't contain
 * colons; zone names might, defensively we take the last).
 */
function splitZoneKey(zoneKey) {
  const idx = zoneKey.lastIndexOf(":");
  if (idx === -1) return [zoneKey, ""];
  return [zoneKey.slice(0, idx), zoneKey.slice(idx + 1)];
}

/**
 * beforePageRender hook.
 *
 * Replaces every symbol reference in the page with the referenced
 * (published) symbol's content, inlined with namespaced ids.
 *
 * References are found anywhere in the tree, not just at the top level: a
 * component dropped into a slot (Flex/Grid/Col) lives in an array on the
 * parent's props, and legacy pages keep nested content in `data.zones`.
 * Missing either of those leaves the reference unexpanded, and it then
 * renders as nothing on the live site.
 *
 * Symbols may themselves contain references, so expansion recurses;
 * `ancestors` breaks any reference cycle rather than recursing until the
 * stack blows.
 *
 * The DB connection is already open by the time render hooks run (the
 * page/content lookup in the front-end route connects first), so we
 * query the model directly.
 */
export async function expandSymbols({ data }) {
  if (!data || !Array.isArray(data.content)) return data;

  const legacyZones = Object.values(data.zones || {}).filter(Array.isArray);
  const referenced =
    containsSymbolReference(data.content) ||
    legacyZones.some((items) => containsSymbolReference(items));
  if (!referenced) return data;

  const Symbol = getSymbolModel();
  const mergedZones = { ...(data.zones || {}) };
  // One page can reference the same symbol many times; fetch each once.
  const cache = new Map();

  async function loadSymbolContent(symbolId) {
    if (cache.has(symbolId)) return cache.get(symbolId);

    let parsed = null;
    try {
      const doc = await Symbol.findOne({ _id: symbolId, published: true }).lean();
      if (doc) {
        const json = JSON.parse(doc.content);
        if (json && Array.isArray(json.content)) parsed = json;
      }
    } catch (e) {
      console.error("[premast:symbols] failed to load symbol", symbolId, e);
    }
    cache.set(symbolId, parsed);
    return parsed;
  }

  /** Expand any references inside a single item's slot props. */
  async function expandSlots(item, ancestors) {
    const props = item?.props;
    if (!props || typeof props !== "object") return item;

    let changed = false;
    const nextProps = { ...props };
    for (const [key, value] of Object.entries(props)) {
      if (!isSlotArray(value)) continue;
      const expanded = await expandList(value, ancestors);
      if (expanded !== value) {
        nextProps[key] = expanded;
        changed = true;
      }
    }
    return changed ? { ...item, props: nextProps } : item;
  }

  async function expandList(items, ancestors) {
    if (!containsSymbolReference(items)) return items;

    const out = [];
    for (const item of items) {
      const symbolId = referencedSymbolId(item);

      if (symbolId === null) {
        out.push(await expandSlots(item, ancestors));
        continue;
      }
      if (!symbolId || !mongoose.isValidObjectId(symbolId)) continue;
      if (ancestors.has(symbolId)) {
        console.error(
          "[premast:symbols] circular component reference, skipping",
          symbolId,
        );
        continue;
      }

      const parsed = await loadSymbolContent(symbolId);
      if (!parsed) continue;

      // Prefix with the reference block's own id so two references to the
      // same symbol on one page produce distinct id namespaces.
      const prefix = item.props?.id || String(symbolId);
      const nested = new Set(ancestors).add(symbolId);

      const inner = await expandList(parsed.content, nested);
      for (const sub of inner) out.push(namespaceItem(sub, prefix));

      for (const [zoneKey, zoneItems] of Object.entries(parsed.zones || {})) {
        if (!Array.isArray(zoneItems)) continue;
        const [parentId, zoneName] = splitZoneKey(zoneKey);
        const expandedZone = await expandList(zoneItems, nested);
        mergedZones[`${prefix}::${parentId}:${zoneName}`] = expandedZone.map((z) =>
          namespaceItem(z, prefix),
        );
      }
    }
    return out;
  }

  const newContent = await expandList(data.content, new Set());

  // Legacy pages keep nested content here rather than in slot props.
  for (const [zoneKey, zoneItems] of Object.entries(data.zones || {})) {
    if (!Array.isArray(zoneItems)) continue;
    mergedZones[zoneKey] = await expandList(zoneItems, new Set());
  }

  return { ...data, content: newContent, zones: mergedZones };
}
