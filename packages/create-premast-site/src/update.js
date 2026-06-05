#!/usr/bin/env node

import * as p from "@clack/prompts";
import pc from "picocolors";
import { resolve, join, dirname, relative } from "path";
import { fileURLToPath } from "url";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "fs";
import { execSync, spawn } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Template directory (same logic as create)
const TEMPLATE_DIR = existsSync(resolve(__dirname, "../template"))
  ? resolve(__dirname, "../template")
  : resolve(__dirname, "../../templates/starter");

const PREMAST_META_FILE = ".premast.json";

// Files that are always client-specific and should NEVER be auto-updated
const CLIENT_ONLY_FILES = new Set([
  "site.config.js",
  "next.config.mjs",
  "theme/tokens.js",
  "theme/antd-theme.js",
  "components/layout/Header.jsx",
  "components/layout/Footer.jsx",
  ".env.local",
  ".env.local.example",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
]);

// Files that should be compared and optionally updated
const MANAGED_FILES = [
  "middleware.js",
  "jsconfig.json",
  "app/layout.jsx",
  "app/admin/layout.jsx",
  "app/(site)/layout.jsx",
  "app/(site)/page.jsx",
  "app/(site)/[...path]/page.jsx",
  "app/admin/login/page.jsx",
  "app/admin/login/layout.jsx",
  "app/admin/setup/page.jsx",
  "app/admin/setup/layout.jsx",
  "app/admin/(dashboard)/layout.jsx",
  "app/admin/(dashboard)/page.jsx",
  "app/admin/(dashboard)/PuckProvider.jsx",
  "app/admin/(dashboard)/[...path]/page.jsx",
  "app/api/[...route]/route.js",
  "components/puck/PuckFieldOverrides.jsx",
  "components/seo/SearchIndexingField.jsx",
  "components/seo/SeoScoreField.jsx",
  "components/seo/seo-analyzer.js",
  "theme/puck.css",
  "theme/ThemeRootVars.jsx",
  "app/antd-provider.jsx",
  ".gitignore",
  "puck.config.js",
  "app/sitemap.js",
  "app/robots.js",
];

/** Run a command asynchronously. */
function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "pipe", shell: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => { stdout += d.toString(); });
    child.stderr?.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `${cmd} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

/** Detect package manager from lockfile. */
function detectPackageManager(projectDir) {
  if (existsSync(join(projectDir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(projectDir, "yarn.lock"))) return "yarn";
  return "npm";
}

/** Get all @premast/* dependencies from package.json (deps + devDeps). */
function getPremastDeps(projectDir) {
  const pkgPath = join(projectDir, "package.json");
  if (!existsSync(pkgPath)) return {};
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const deps = {};
  for (const section of [pkg.dependencies, pkg.devDependencies]) {
    for (const [name, version] of Object.entries(section || {})) {
      if (name.startsWith("@premast/")) {
        deps[name] = version;
      }
    }
  }
  return deps;
}

/** Simple line-by-line diff display. */
function showDiff(oldContent, newContent, filePath) {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  if (oldContent === newContent) return false;

  console.log(pc.dim(`\n  --- ${filePath} (current)`));
  console.log(pc.dim(`  +++ ${filePath} (updated)`));

  // Simple diff: show lines that differ
  const maxLines = Math.max(oldLines.length, newLines.length);
  let changes = 0;

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) continue;

    changes++;
    if (changes > 20) {
      console.log(pc.dim(`  ... and more changes (${maxLines - i} lines remaining)`));
      break;
    }

    if (oldLine !== undefined && newLine !== undefined) {
      console.log(pc.red(`  - ${oldLine}`));
      console.log(pc.green(`  + ${newLine}`));
    } else if (oldLine !== undefined) {
      console.log(pc.red(`  - ${oldLine}`));
    } else {
      console.log(pc.green(`  + ${newLine}`));
    }
  }

  return true;
}

const SITE_SETTINGS_IMPORT =
  'import { PremastSiteSettings } from "@premast/site-core/site-settings";';
const SITE_SETTINGS_TAG = "<PremastSiteSettings siteConfig={siteConfig} />";
const SITE_SETTINGS_LAYOUT = "app/(site)/layout.jsx";

/** Print copy-paste instructions when we can't safely auto-wire the layout. */
function printSiteSettingsSnippet() {
  console.log(pc.yellow(`\n  Add these two lines to ${SITE_SETTINGS_LAYOUT} to enable`));
  console.log(pc.yellow(`  analytics / site-wide settings injection on public pages:`));
  console.log(pc.dim("\n  1) with the other imports:"));
  console.log(pc.green(`     ${SITE_SETTINGS_IMPORT}`));
  console.log(pc.dim("\n  2) inside the returned JSX (anywhere in the public tree):"));
  console.log(pc.green(`     ${SITE_SETTINGS_TAG}`));
  console.log();
}

/** Build the auto-wired layout content, or null if we can't place it safely. */
function buildWiredLayout(content) {
  // 1) import — after the first import statement.
  const firstImport = content.match(/^import .*$/m);
  if (!firstImport) return null;
  const importEnd = firstImport.index + firstImport[0].length;
  let next = content.slice(0, importEnd) + "\n" + SITE_SETTINGS_IMPORT + content.slice(importEnd);

  // 2) tag — right after the first single-line opening tag inside `return (`.
  const ret = next.match(/return \(\s*\n([ \t]*)(<[^\n]*>)\s*\n/);
  if (!ret) return null;
  const indent = ret[1];
  const openTagEnd = ret.index + ret[0].length;
  next = next.slice(0, openTagEnd) + `${indent}  ${SITE_SETTINGS_TAG}\n` + next.slice(openTagEnd);
  return next;
}

/**
 * Wire the generic <PremastSiteSettings/> seam into the public layout. One-time
 * step: future site-wide settings add an injector in site-core, not another
 * layout edit. Best-effort auto-inject with confirmation; falls back to printing
 * the snippet when the layout can't be matched safely.
 */
async function wireSiteSettings(projectDir) {
  const layoutPath = join(projectDir, SITE_SETTINGS_LAYOUT);
  if (!existsSync(layoutPath)) return;

  const content = readFileSync(layoutPath, "utf-8");
  if (content.includes("PremastSiteSettings")) {
    p.log.success("Site settings injection already wired.");
    return;
  }

  const wired = buildWiredLayout(content);
  if (!wired) {
    p.log.warn("Couldn't safely auto-wire the public layout.");
    printSiteSettingsSnippet();
    return;
  }

  p.log.info(pc.bold(`\n${SITE_SETTINGS_LAYOUT} — enable site-wide settings injection`));
  showDiff(content, wired, SITE_SETTINGS_LAYOUT);

  const action = await p.select({
    message: `Wire <PremastSiteSettings/> into ${SITE_SETTINGS_LAYOUT}?`,
    options: [
      { value: "apply", label: "Apply", hint: "insert the import + tag" },
      { value: "backup", label: "Backup & Apply", hint: "save .bak, then apply" },
      { value: "skip", label: "Skip", hint: "I'll add it manually" },
    ],
  });

  if (p.isCancel(action) || action === "skip") {
    printSiteSettingsSnippet();
    return;
  }
  if (action === "backup") writeFileSync(layoutPath + ".bak", content);
  writeFileSync(layoutPath, wired);
  console.log(`  ${pc.green("✓")} Wired ${SITE_SETTINGS_LAYOUT}`);
}

/** Read .premast.json metadata. */
function readMeta(projectDir) {
  const metaPath = join(projectDir, PREMAST_META_FILE);
  if (!existsSync(metaPath)) {
    return { templateVersion: "0.0.0", createdAt: null, lastUpdate: null };
  }
  return JSON.parse(readFileSync(metaPath, "utf-8"));
}

/** Write .premast.json metadata. */
function writeMeta(projectDir, meta) {
  const metaPath = join(projectDir, PREMAST_META_FILE);
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
}

/** Get latest published version from the registry. */
function getTemplateVersion() {
  // Try to fetch the latest version from the registry
  try {
    const latest = execSync("npm view @premast/site-core version --registry=https://npm.pkg.github.com", {
      encoding: "utf-8",
      timeout: 10_000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (latest) return latest;
  } catch {
    // Registry unreachable — fall back to installed version
  }

  // Fallback: read own package version (installed locally)
  const ownPkg = resolve(__dirname, "../package.json");
  return JSON.parse(readFileSync(ownPkg, "utf-8")).version;
}

async function main() {
  console.log();
  p.intro(pc.bgCyan(pc.black(" premast update ")));

  const projectDir = process.cwd();

  // Verify this is a Premast project
  const pkgPath = join(projectDir, "package.json");
  if (!existsSync(pkgPath)) {
    p.cancel("No package.json found. Run this command from your project root.");
    process.exit(1);
  }

  const premastDeps = getPremastDeps(projectDir);
  if (Object.keys(premastDeps).length === 0) {
    p.cancel("No @premast/* dependencies found. Is this a Premast project?");
    process.exit(1);
  }

  const meta = readMeta(projectDir);
  const templateVersion = getTemplateVersion();
  const pm = detectPackageManager(projectDir);

  p.log.info(`Project: ${pc.cyan(projectDir)}`);
  p.log.info(`Package manager: ${pc.cyan(pm)}`);
  p.log.info(`Current template version: ${pc.yellow(meta.templateVersion || "unknown")}`);
  p.log.info(`Latest template version: ${pc.green(templateVersion)}`);
  p.log.info(`Premast packages: ${pc.cyan(Object.keys(premastDeps).join(", "))}`);

  // Step 1: Update packages
  const updatePackages = await p.confirm({
    message: "Update @premast/* packages to latest?",
    initialValue: true,
  });

  if (p.isCancel(updatePackages)) {
    p.cancel("Update cancelled.");
    process.exit(0);
  }

  if (updatePackages) {
    const s = p.spinner();

    // Rewrite package.json ranges to ^latest so installs get the correct version
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    for (const name of Object.keys(premastDeps)) {
      const section = pkg.dependencies?.[name] !== undefined ? "dependencies" : "devDependencies";
      pkg[section][name] = `^${templateVersion}`;
    }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 3) + "\n");

    s.start(`Installing packages with ${pm}...`);
    try {
      if (pm === "pnpm") {
        await runCommand("pnpm", ["install"], projectDir);
      } else if (pm === "yarn") {
        await runCommand("yarn", ["install"], projectDir);
      } else {
        await runCommand("npm", ["install"], projectDir);
      }
      s.stop(`Packages updated to ^${templateVersion}.`);
    } catch (e) {
      s.stop(pc.yellow(`Package install failed: ${e.message}`));
      p.log.warn("You can run install manually later.");
    }
  }

  // Step 2: Check template files
  p.log.step("Checking template files for updates...");

  const filesToUpdate = [];
  const newFiles = [];

  for (const filePath of MANAGED_FILES) {
    const templateFile = join(TEMPLATE_DIR, filePath);
    const projectFile = join(projectDir, filePath);

    if (!existsSync(templateFile)) continue;

    const templateContent = readFileSync(templateFile, "utf-8");

    if (!existsSync(projectFile)) {
      // New file from template
      newFiles.push({ filePath, content: templateContent });
    } else {
      const projectContent = readFileSync(projectFile, "utf-8");
      if (projectContent !== templateContent) {
        filesToUpdate.push({
          filePath,
          currentContent: projectContent,
          newContent: templateContent,
        });
      }
    }
  }

  if (filesToUpdate.length === 0 && newFiles.length === 0) {
    p.log.success("All template files are up to date!");
  } else {
    // Show new files
    if (newFiles.length > 0) {
      p.log.info(`\n${pc.green(`${newFiles.length} new file(s)`)} from template:`);
      for (const { filePath } of newFiles) {
        console.log(`  ${pc.green("+")} ${filePath}`);
      }

      const addNew = await p.confirm({
        message: `Add ${newFiles.length} new file(s) to your project?`,
        initialValue: true,
      });

      if (!p.isCancel(addNew) && addNew) {
        for (const { filePath, content } of newFiles) {
          const fullPath = join(projectDir, filePath);
          const dir = dirname(fullPath);
          if (!existsSync(dir)) {
            const { mkdirSync } = await import("fs");
            mkdirSync(dir, { recursive: true });
          }
          writeFileSync(fullPath, content);
          console.log(`  ${pc.green("✓")} Added ${filePath}`);
        }
      }
    }

    // Show changed files one by one
    if (filesToUpdate.length > 0) {
      p.log.info(`\n${pc.yellow(`${filesToUpdate.length} file(s)`)} differ from template:`);

      // Files that contain client-specific config — warn before replacing
      const CAUTION_FILES = new Set(["next.config.mjs", "app/layout.jsx", "app/(site)/layout.jsx"]);

      for (const { filePath, currentContent, newContent } of filesToUpdate) {
        console.log();
        p.log.info(pc.bold(filePath));

        if (CAUTION_FILES.has(filePath)) {
          console.log(pc.yellow(`  ⚠ This file may contain client-specific changes (e.g. plugins, custom config).`));
          console.log(pc.yellow(`    Review the diff carefully before replacing.`));
        }

        showDiff(currentContent, newContent, filePath);

        const defaultSkip = CAUTION_FILES.has(filePath);

        const action = await p.select({
          message: `What to do with ${filePath}?`,
          options: [
            { value: "skip", label: `Skip${defaultSkip ? " (recommended)" : ""}`, hint: "keep your current version" },
            { value: "replace", label: "Replace", hint: "use the new template version" },
            { value: "backup", label: "Backup & Replace", hint: "save .bak, then replace" },
          ],
        });

        if (p.isCancel(action)) {
          p.cancel("Update cancelled.");
          process.exit(0);
        }

        const projectFile = join(projectDir, filePath);

        if (action === "replace") {
          writeFileSync(projectFile, newContent);
          console.log(`  ${pc.green("✓")} Updated ${filePath}`);
        } else if (action === "backup") {
          writeFileSync(projectFile + ".bak", currentContent);
          writeFileSync(projectFile, newContent);
          console.log(`  ${pc.green("✓")} Backed up & updated ${filePath}`);
        } else {
          console.log(`  ${pc.dim("○")} Skipped ${filePath}`);
        }
      }
    }
  }

  // Step 3: Wire the site-settings injection seam into the public layout
  p.log.step("Checking site-settings injection wiring...");
  await wireSiteSettings(projectDir);

  // Step 4: Update metadata
  writeMeta(projectDir, {
    templateVersion: templateVersion,
    createdAt: meta.createdAt || new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
  });

  p.outro(pc.green("Update complete!"));
}

main().catch((err) => {
  console.error(pc.red("Error:"), err.message);
  process.exit(1);
});
