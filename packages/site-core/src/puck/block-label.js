/**
 * Resolving the display name for a block in the Puck palette.
 *
 * Kept as a plain module (no JSX, no "use client") so it can be unit
 * tested directly in node.
 */

/** Fallback for blocks that don't declare a label: "HeroBlock" → "Hero". */
export function humanizeBlockName(name) {
  return String(name ?? "")
    .replace(/Block$/, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
}

/**
 * A block's own `label` wins; otherwise derive one from the type name.
 *
 * Puck hands `drawerItem` overrides only the component `name` — never the
 * `label` it resolved — so an override that wants the declared label has
 * to look it up in the config itself. Skipping that lookup silently
 * ignores every block's `label`, and renders any type that doesn't follow
 * the "<Name>Block" convention as a raw type string.
 */
export function resolveBlockLabel(puckConfig, name) {
  const declared = puckConfig?.components?.[name]?.label;
  if (typeof declared === "string" && declared.trim()) return declared;
  return humanizeBlockName(name);
}
