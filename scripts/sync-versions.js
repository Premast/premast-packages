#!/usr/bin/env node

/**
 * sync-versions.js — Single source of truth for all @premast package versions.
 *
 * Usage:
 *   node scripts/sync-versions.js          → check for drift (CI-safe, exits 1 on mismatch)
 *   node scripts/sync-versions.js --fix    → auto-fix all versions to match site-core
 *   node scripts/sync-versions.js 0.5.0    → set all packages to 0.5.0
 *
 * How it works:
 *   site-core/package.json is the source of truth. This script reads its version
 *   and ensures every other @premast package matches. Run it before every release.
 *
 * Add to your publish workflow:
 *   "prepublish:all": "node scripts/sync-versions.js"
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const PACKAGES = [
  "packages/site-core",
  "packages/site-plugin-seo",
  "packages/site-plugin-ui",
  "packages/site-plugin-mcp",
  "packages/site-plugin-i18n",
  "packages/create-premast-site",
];

// Read the source of truth
const corePkgPath = resolve(ROOT, "packages/site-core/package.json");
const corePkg = JSON.parse(readFileSync(corePkgPath, "utf-8"));
const targetVersion = process.argv[2] && !process.argv[2].startsWith("-")
  ? process.argv[2]
  : corePkg.version;
const shouldFix = process.argv.includes("--fix") || (process.argv[2] && !process.argv[2].startsWith("-"));

let drifted = false;

for (const pkgDir of PACKAGES) {
  const pkgPath = resolve(ROOT, pkgDir, "package.json");
  if (!existsSync(pkgPath)) continue;

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

  if (pkg.version !== targetVersion) {
    if (shouldFix) {
      pkg.version = targetVersion;
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      console.log(`  ✓ ${pkg.name}: ${pkg.version} → ${targetVersion}`);
    } else {
      console.error(`  ✗ ${pkg.name}: ${pkg.version} (expected ${targetVersion})`);
      drifted = true;
    }
  } else {
    console.log(`  ✓ ${pkg.name}: ${pkg.version}`);
  }
}

// Also check CLI doesn't have hardcoded version strings
const cliPath = resolve(ROOT, "packages/create-premast-site/src/index.js");
if (existsSync(cliPath)) {
  const cliSource = readFileSync(cliPath, "utf-8");
  // Check for any hardcoded semver that looks like a premast version (not in comments)
  const lines = cliSource.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) continue;
    // Match hardcoded "^0.x.0" patterns that aren't PREMAST_VERSION
    const match = line.match(/"(\^?\d+\.\d+\.\d+)"/);
    if (match && match[1] !== `^${targetVersion}` && !line.includes("PREMAST_VERSION") && !line.includes("getPremastVersion")) {
      // Exclude known non-premast versions (dependency versions like "^0.9.1")
      if (line.includes("@clack") || line.includes("picocolors") || line.includes("return")) continue;
      console.error(`  ⚠ CLI index.js:${i + 1} has hardcoded version "${match[1]}": ${line.trim()}`);
      drifted = true;
    }
  }
}

if (drifted) {
  console.error("\nVersion drift detected! Run: node scripts/sync-versions.js --fix");
  process.exit(1);
} else {
  console.log(`\nAll packages at v${targetVersion} ✓`);
}
