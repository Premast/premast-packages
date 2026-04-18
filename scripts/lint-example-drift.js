#!/usr/bin/env node
/**
 * Fail if examples/full-site structurally diverges from templates/starter.
 *
 * Rule: every non-ignored file in the starter must exist in the
 * example. Contents are allowed to differ — only the set of files is
 * enforced, because the example is supposed to *represent the shape*
 * of what a user gets from `create-premast-site`.
 *
 * Files listed in ALLOW_MISSING may be absent in the example (we
 * remove them deliberately because they belong only to the scaffold).
 */

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const STARTER = path.join(REPO_ROOT, "templates", "starter");
const EXAMPLE = path.join(REPO_ROOT, "examples", "full-site");

const IGNORED_DIRS = new Set(["node_modules", ".next", ".turbo", ".pnpm-store", "uploads"]);
const IGNORED_FILES = new Set([".env.local", ".env.test.local", "next-env.d.ts"]);
const ALLOW_MISSING = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  ".cursor",
  ".premast.json",
  ".npmrc",
]);

function walk(root, rel = "") {
  const out = [];
  const abs = path.join(root, rel);
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    if (IGNORED_FILES.has(entry.name)) continue;
    const nextRel = rel ? path.join(rel, entry.name) : entry.name;
    if (entry.isDirectory()) {
      out.push(...walk(root, nextRel));
    } else {
      out.push(nextRel);
    }
  }
  return out;
}

function main() {
  if (!fs.existsSync(EXAMPLE)) {
    console.error(`[drift] examples/full-site missing at ${EXAMPLE}`);
    process.exit(1);
  }

  const starterFiles = new Set(walk(STARTER));
  const exampleFiles = new Set(walk(EXAMPLE));

  const missing = [];
  for (const rel of starterFiles) {
    const top = rel.split(path.sep)[0];
    if (ALLOW_MISSING.has(top) || ALLOW_MISSING.has(rel)) continue;
    if (!exampleFiles.has(rel)) missing.push(rel);
  }

  if (missing.length) {
    console.error(
      "[drift] examples/full-site is missing files that exist in templates/starter:",
    );
    for (const f of missing) console.error("  - " + f);
    console.error(
      "\nFix: copy each file from templates/starter into examples/full-site (contents may differ, but the file must exist).",
    );
    process.exit(1);
  }

  console.log(`[drift] ok — ${starterFiles.size} starter files present in example`);
}

main();
