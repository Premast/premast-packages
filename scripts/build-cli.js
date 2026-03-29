#!/usr/bin/env node

/**
 * Copies templates/starter/ into packages/create-premast-site/template/
 * so the CLI ships with the template bundled inside.
 *
 * Source of truth: templates/starter/
 * This script runs before publishing (pnpm build:cli).
 */

import { cpSync, rmSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE = resolve(ROOT, "templates/starter");
const DEST = resolve(ROOT, "packages/create-premast-site/template");

if (!existsSync(SOURCE)) {
  console.error("ERROR: templates/starter/ not found");
  process.exit(1);
}

// Clean previous copy
if (existsSync(DEST)) {
  rmSync(DEST, { recursive: true, force: true });
}

// Copy fresh
cpSync(SOURCE, DEST, { recursive: true });

// Remove files that shouldn't be in the published template
const REMOVE = ["node_modules", ".next", ".env.local", ".gitignore"];
for (const name of REMOVE) {
  const path = resolve(DEST, name);
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

console.log("✓ Template copied to packages/create-premast-site/template/");
