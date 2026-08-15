#!/usr/bin/env node

import * as p from "@clack/prompts";
import pc from "picocolors";
import { resolve, join } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { withServerPlugin } from "./server-plugins.js";
import { withEditorProvider } from "./puck-provider.js";

const AVAILABLE_PLUGINS = [
  {
    value: "@premast/site-plugin-seo",
    label: "SEO Plugin",
    hint: "Sitemap, robots.txt, SEO fields, score analyzer",
    importName: "seoPlugin",
    importPath: "@premast/site-plugin-seo",
    configCall: "seoPlugin()",
    serverImportPath: "@premast/site-plugin-seo/server",
    serverImportName: "seoPluginServer",
    pluginName: "seo",
    editorImports: 'import { SeoScoreField, SearchIndexingField } from "@premast/site-plugin-seo/editor";',
  },
  {
    value: "@premast/site-plugin-ui",
    label: "UI Plugin",
    hint: "Ant Design blocks: Flex, Grid, Card, Tabs, Carousel, etc.",
    importName: "uiPlugin",
    importPath: "@premast/site-plugin-ui",
    configCall: "uiPlugin()",
  },
  {
    value: "@premast/site-plugin-mcp",
    label: "MCP Plugin",
    hint: "AI agent integration via Model Context Protocol",
    importName: "mcpPlugin",
    importPath: "@premast/site-plugin-mcp",
    configCall: "mcpPlugin()",
    serverImportPath: "@premast/site-plugin-mcp/server",
    serverImportName: "mcpPluginServer",
    pluginName: "mcp",
  },
  {
    value: "@premast/site-plugin-i18n",
    label: "i18n Plugin",
    hint: "Multilingual content, hreflang/sitemap, locale-aware admin",
    importName: "i18nPlugin",
    importPath: "@premast/site-plugin-i18n",
    configCall: 'i18nPlugin({ locales: ["en"], defaultLocale: "en" })',
    serverImportPath: "@premast/site-plugin-i18n/server",
    serverImportName: "i18nPluginServer",
    serverFactoryCall: 'i18nPluginServer({ locales: ["en"], defaultLocale: "en" })',
    pluginName: "i18n",
  },
  {
    value: "@premast/site-plugin-media",
    label: "Media Plugin",
    hint: "Media library + `media` field type (DO Spaces / S3 uploads)",
    importName: "mediaPlugin",
    importPath: "@premast/site-plugin-media",
    configCall: "mediaPlugin()",
    serverImportPath: "@premast/site-plugin-media/server",
    serverImportName: "mediaPluginServer",
    pluginName: "media",
  },
  {
    value: "@premast/site-plugin-symbols",
    label: "Symbols Plugin",
    hint: "Reusable Components: build a section once, reference it on any page",
    importName: "symbolsPlugin",
    importPath: "@premast/site-plugin-symbols",
    configCall: "symbolsPlugin()",
    serverImportPath: "@premast/site-plugin-symbols/server",
    serverImportName: "symbolsPluginServer",
    pluginName: "symbols",
    // Registers one palette block per published component, which means
    // extending the Puck config at runtime — needs its own provider.
    editorProvider: {
      importName: "SymbolsPuckConfigProvider",
      importPath: "@premast/site-plugin-symbols/editor",
    },
  },
];

function detectPackageManager() {
  if (existsSync("pnpm-lock.yaml")) return "pnpm";
  if (existsSync("yarn.lock")) return "yarn";
  return "npm";
}

async function main() {
  p.intro(pc.bold("premast add-plugin"));

  const cwd = process.cwd();

  // Check we're inside a Premast site
  const pkgPath = join(cwd, "package.json");
  const siteConfigPath = join(cwd, "site.config.js");
  const puckConfigPath = join(cwd, "puck.config.js");
  const nextConfigPath = join(cwd, "next.config.mjs");

  if (!existsSync(pkgPath) || !existsSync(siteConfigPath)) {
    p.cancel("Not a Premast site. Run this from the root of a Premast project.");
    process.exit(1);
  }

  // Read current package.json to detect installed plugins
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  const installedPlugins = AVAILABLE_PLUGINS.filter((pl) => deps[pl.value]);
  const availablePlugins = AVAILABLE_PLUGINS.filter((pl) => !deps[pl.value]);

  if (availablePlugins.length === 0) {
    p.log.info("All available plugins are already installed.");
    p.outro("Nothing to do.");
    process.exit(0);
  }

  if (installedPlugins.length > 0) {
    p.log.info(
      `Already installed: ${installedPlugins.map((pl) => pc.green(pl.label)).join(", ")}`,
    );
  }

  const selected = await p.multiselect({
    message: "Select plugins to add",
    options: availablePlugins.map((pl) => ({
      value: pl.value,
      label: pl.label,
      hint: pl.hint,
    })),
    required: true,
  });

  if (p.isCancel(selected)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  const plugins = AVAILABLE_PLUGINS.filter((pl) => selected.includes(pl.value));

  const s = p.spinner();

  // 1. Update package.json
  s.start("Updating package.json...");
  for (const plugin of plugins) {
    pkg.dependencies[plugin.value] = "^1.0.0";
  }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  s.stop("package.json updated.");

  // 2. Update site.config.js
  const serverWiringFailures = [];
  const providerWiringFailures = [];
  s.start("Updating site.config.js...");
  if (existsSync(siteConfigPath)) {
    let siteConfig = readFileSync(siteConfigPath, "utf-8");
    for (const plugin of plugins) {
      // Add import if not present
      if (!siteConfig.includes(plugin.importPath)) {
        const importLine = `import { ${plugin.importName} } from "${plugin.importPath}";`;
        // Insert after last import
        const lastImportIdx = siteConfig.lastIndexOf("import ");
        const lineEnd = siteConfig.indexOf("\n", lastImportIdx);
        siteConfig = siteConfig.slice(0, lineEnd + 1) + importLine + "\n" + siteConfig.slice(lineEnd + 1);
      }
      // Add to plugins array if not present
      if (!siteConfig.includes(plugin.configCall)) {
        siteConfig = siteConfig.replace(
          /plugins:\s*\[/,
          `plugins: [\n    ${plugin.configCall},`,
        );
      }
      // Add serverPlugins if plugin has server exports
      if (plugin.serverImportPath && !siteConfig.includes(plugin.serverImportPath)) {
        const updated = withServerPlugin(siteConfig, plugin);
        if (updated) {
          siteConfig = updated;
        } else {
          serverWiringFailures.push(plugin);
        }
      }
    }
    writeFileSync(siteConfigPath, siteConfig);
  }
  s.stop("site.config.js updated.");

  for (const plugin of serverWiringFailures) {
    const spreadExpr = plugin.serverFactoryCall || plugin.serverImportName;
    p.log.warn(
      `Couldn't wire ${pc.bold(plugin.label)} into serverPlugins automatically.\n` +
        `Add this inside the serverPlugins loader in site.config.js:\n` +
        pc.dim(`  const { ${plugin.serverImportName} } = await import("${plugin.serverImportPath}");\n`) +
        pc.dim(`  // then add to the returned array:\n`) +
        pc.dim(`  { name: "${plugin.pluginName}", ...${spreadExpr} }`),
    );
  }

  // 2b. Swap the admin editor's Puck provider when a plugin needs one.
  const providerPath = join(cwd, "app/admin/(dashboard)/PuckProvider.jsx");
  for (const plugin of plugins) {
    if (!plugin.editorProvider) continue;
    if (!existsSync(providerPath)) {
      providerWiringFailures.push(plugin);
      continue;
    }
    const updated = withEditorProvider(readFileSync(providerPath, "utf-8"), plugin);
    if (updated) writeFileSync(providerPath, updated);
    else providerWiringFailures.push(plugin);
  }

  for (const plugin of providerWiringFailures) {
    p.log.warn(
      `Couldn't switch the editor provider for ${pc.bold(plugin.label)}.\n` +
        `In app/admin/(dashboard)/PuckProvider.jsx, replace PuckConfigProvider with:\n` +
        pc.dim(`  import { ${plugin.editorProvider.importName} } from "${plugin.editorProvider.importPath}";`),
    );
  }

  // 3. Update puck.config.js
  s.start("Updating puck.config.js...");
  if (existsSync(puckConfigPath)) {
    let puckConfig = readFileSync(puckConfigPath, "utf-8");
    for (const plugin of plugins) {
      // Add import if not present
      if (!puckConfig.includes(plugin.importPath)) {
        const importLine = `import { ${plugin.importName} } from "${plugin.importPath}";`;
        const lastImportIdx = puckConfig.lastIndexOf("import ");
        const lineEnd = puckConfig.indexOf("\n", lastImportIdx);
        puckConfig = puckConfig.slice(0, lineEnd + 1) + importLine + "\n" + puckConfig.slice(lineEnd + 1);
      }
      // Add to plugins array if not present
      if (!puckConfig.includes(plugin.configCall)) {
        puckConfig = puckConfig.replace(
          /const plugins\s*=\s*\[/,
          `const plugins = [\n  ${plugin.configCall},`,
        );
      }
      // Add editor imports (e.g. SEO fields)
      if (plugin.editorImports && !puckConfig.includes(plugin.editorImports.split("from")[0].trim())) {
        const lastImportIdx = puckConfig.lastIndexOf("import ");
        const lineEnd = puckConfig.indexOf("\n", lastImportIdx);
        puckConfig = puckConfig.slice(0, lineEnd + 1) + plugin.editorImports + "\n" + puckConfig.slice(lineEnd + 1);
      }
    }
    writeFileSync(puckConfigPath, puckConfig);
  }
  s.stop("puck.config.js updated.");

  // 4. Update next.config.mjs
  s.start("Updating next.config.mjs...");
  if (existsSync(nextConfigPath)) {
    let nextConfig = readFileSync(nextConfigPath, "utf-8");
    for (const plugin of plugins) {
      if (!nextConfig.includes(plugin.importPath)) {
        nextConfig = nextConfig.replace(
          /transpilePackages:\s*\[/,
          `transpilePackages: [\n    "${plugin.importPath}",`,
        );
      }
    }
    writeFileSync(nextConfigPath, nextConfig);
  }
  s.stop("next.config.mjs updated.");

  // 5. Install dependencies
  s.start("Installing dependencies...");
  const pm = detectPackageManager();
  try {
    execSync(`${pm} install`, { cwd, stdio: "pipe" });
    s.stop("Dependencies installed.");
  } catch {
    s.stop(pc.yellow("Install failed — run manually: " + pm + " install"));
  }

  p.outro(
    pc.green(`✓ Added ${plugins.map((pl) => pl.label).join(", ")}`) +
    "\n\n  Restart your dev server to use the new plugins.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
