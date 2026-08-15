/**
 * Swap the admin editor's Puck provider for a plugin-supplied one.
 *
 * Some plugins need to extend the Puck config at runtime rather than at
 * import time — the symbols plugin registers one palette block per
 * published component, which can only be known by fetching them. That
 * requires wrapping the editor in the plugin's own provider instead of
 * site-core's `PuckConfigProvider`.
 *
 * Installing such a plugin without this swap leaves it half-wired: the
 * config and server extension register, but the advertised per-component
 * palette entries never appear.
 *
 * Returns the updated source, `src` unchanged if it's already wired, or
 * null if the file has been customised beyond what we can safely rewrite
 * (so the caller can tell the user to do it by hand).
 */
export function withEditorProvider(src, plugin) {
  const provider = plugin?.editorProvider;
  if (!provider) return src;

  const { importName, importPath } = provider;
  if (src.includes(importName)) return src;
  if (!src.includes("PuckConfigProvider")) return null;

  const importRe =
    /import\s*\{\s*PuckConfigProvider\s*\}\s*from\s*["']@premast\/site-core\/admin["'];?/;
  if (!importRe.test(src)) return null;

  return src
    .replace(importRe, `import { ${importName} } from "${importPath}";`)
    .replaceAll("<PuckConfigProvider", `<${importName}`)
    .replaceAll("</PuckConfigProvider>", `</${importName}>`);
}
