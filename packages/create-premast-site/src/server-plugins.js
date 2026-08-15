/**
 * Register a plugin's server extension in site.config.js.
 *
 * Sites scaffolded from the starter already ship a `serverPlugins` loader
 * (the starter registers SEO), so only creating one when none exists
 * silently skipped every server-side plugin added afterwards — its API
 * routes, models and render hooks never loaded. When a loader is already
 * there we splice into it instead.
 *
 * Returns the updated source, or null if the loader couldn't be located,
 * so the caller can tell the user to wire it manually rather than write a
 * broken config.
 */
export function withServerPlugin(src, plugin) {
  // Factory-style server exports (e.g. i18n) must be CALLED before being
  // spread — spreading an uncalled function copies zero enumerable
  // properties and registers no routes/models/hooks.
  const spreadExpr = plugin.serverFactoryCall || plugin.serverImportName;
  const entry = `{ name: "${plugin.pluginName}", ...${spreadExpr} }`;
  const importLine = `const { ${plugin.serverImportName} } = await import("${plugin.serverImportPath}");`;

  if (!src.includes("serverPlugins")) {
    if (!/plugins:\s*\[[\s\S]*?\],/.test(src)) return null;
    return src.replace(
      /plugins:\s*\[[\s\S]*?\],/,
      (match) =>
        `${match}\n  serverPlugins: async () => {\n    ${importLine}\n    return [${entry}];\n  },`,
    );
  }

  const loaderIdx = src.indexOf("serverPlugins");
  const returnIdx = src.indexOf("return [", loaderIdx);
  if (returnIdx === -1) return null;

  const lineStart = src.lastIndexOf("\n", returnIdx) + 1;
  const indent = src.slice(lineStart, returnIdx);
  // Only splice when `return [` starts its own line; anything else means
  // the loader has been reformatted beyond what we can safely edit.
  if (indent.trim() !== "") return null;

  const inserted = `${indent}${importLine}\n`;
  const withImport = src.slice(0, lineStart) + inserted + src.slice(lineStart);
  const insertAt = returnIdx + inserted.length + "return [".length;

  return (
    withImport.slice(0, insertAt) +
    `\n${indent}  ${entry},` +
    withImport.slice(insertAt)
  );
}
