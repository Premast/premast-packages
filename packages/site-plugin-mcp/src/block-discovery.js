import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, join } from "path";

/**
 * Option lists are written as `{ label: "Yes", value: "yes" }` but the
 * value is just as often a boolean or a number. Parsing only quoted
 * values leaves the list empty, and an empty list makes every stored
 * value look invalid.
 */
function parseOptionList(body) {
  const entries = body.matchAll(
    /\{\s*label:\s*"([^"]*)"\s*,\s*value:\s*(?:"([^"]*)"|([\w.+-]+))\s*\}/g,
  );
  const options = [];
  for (const o of entries) {
    let value;
    if (o[2] !== undefined) value = o[2];
    else if (o[3] === "true" || o[3] === "false") value = o[3] === "true";
    else if (!Number.isNaN(Number(o[3]))) value = Number(o[3]);
    else value = o[3];
    options.push({ label: o[1], value });
  }
  return options;
}

/**
 * Resolve a block's fields when they aren't written inline — `fields,`
 * or `fields: sharedFields` pointing at a `const` elsewhere in the file.
 * Returns the object literal's body, or null when there's nothing to
 * resolve.
 */
function resolveReferencedFields(blockSource, fileSource) {
  const ref = blockSource.match(/\bfields\s*(?:,|:\s*([A-Za-z_$][\w$]*)\s*,)/);
  if (!ref) return null;
  const name = ref[1] || "fields";
  const decl = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+${name}\\s*=\\s*\\{`,
  ).exec(fileSource);
  if (!decl) return null;
  return extractObjectBody(fileSource, decl.index + decl[0].length - 1);
}

/**
 * Parse a .jsx/.js block file and extract fields, defaultProps, and label
 * using regex. Works without JSX transpilation.
 */
function parseBlockSource(source, blockName, fileSource = source) {
  const schema = {
    label: blockName.replace(/Block$/, ""),
    fields: {},
    defaultProps: {},
  };

  // Extract label
  const labelMatch = source.match(/label:\s*"([^"]+)"/);
  if (labelMatch) schema.label = labelMatch[1];

  // Extract defaultProps object — find `defaultProps: { ... }`
  const dpMatch = source.match(/defaultProps:\s*\{([^}]+)\}/s);
  if (dpMatch) {
    const dpStr = dpMatch[1];
    // Parse simple key: value pairs
    const entries = dpStr.matchAll(/(\w+):\s*(?:"([^"]*)"|([\d.]+)|(true|false)|(\[[\s\S]*?\]))/g);
    for (const e of entries) {
      const key = e[1];
      if (e[2] !== undefined) schema.defaultProps[key] = e[2];
      else if (e[3] !== undefined) schema.defaultProps[key] = Number(e[3]);
      else if (e[4] !== undefined) schema.defaultProps[key] = e[4] === "true";
    }
  }

  // Extract fields — look for the fields object in the block definition
  // Strategy: find each field definition pattern
  const fieldPattern = /(\w+):\s*\{\s*type:\s*"(\w+)"(?:,\s*label:\s*"([^"]*)")?/g;
  let fieldMatch;

  // First, find the fields: { ... } block
  const fieldsBlockMatch = source.match(/fields:\s*\{([\s\S]*?)\n\s*\},?\s*(?:defaultProps|render|resolvePermissions)/);
  // A block can also reference a fields object defined elsewhere in the
  // file — `fields,` (shorthand) or `fields: sharedFields`. Without this
  // the block parses with zero fields, and every real prop on it then
  // looks unknown.
  const fieldsStr =
    (fieldsBlockMatch && fieldsBlockMatch[1]) ??
    resolveReferencedFields(source, fileSource) ??
    source;

  while ((fieldMatch = fieldPattern.exec(fieldsStr)) !== null) {
    const fieldName = fieldMatch[1];
    const fieldType = fieldMatch[2];
    const fieldLabel = fieldMatch[3] || fieldName;

    // Skip nested arrayFields definitions (they'll be picked up separately)
    if (["label", "text", "header", "content", "title", "description", "imageUrl", "caption", "href"].includes(fieldName)) {
      // Check if this is a top-level field or nested inside arrayFields
      const beforeMatch = fieldsStr.substring(0, fieldMatch.index);
      if (beforeMatch.includes("arrayFields") && !beforeMatch.substring(beforeMatch.lastIndexOf("arrayFields")).includes("}")) {
        continue;
      }
    }

    const field = { type: fieldType, label: fieldLabel };

    // Extract options for select/radio fields
    if (fieldType === "select" || fieldType === "radio") {
      const afterField = fieldsStr.substring(fieldMatch.index);
      const optionsMatch = afterField.match(/options:\s*\[([\s\S]*?)\]/);
      if (optionsMatch) {
        field.options = parseOptionList(optionsMatch[1]);
      }
    }

    // Extract arrayFields for array type
    if (fieldType === "array") {
      const afterField = fieldsStr.substring(fieldMatch.index);
      const arrayFieldsMatch = afterField.match(/arrayFields:\s*\{([\s\S]*?)\}/);
      if (arrayFieldsMatch) {
        const subFields = {};
        const subPattern = /(\w+):\s*\{\s*type:\s*"(\w+)"(?:,\s*label:\s*"([^"]*)")?/g;
        let sub;
        while ((sub = subPattern.exec(arrayFieldsMatch[1])) !== null) {
          subFields[sub[1]] = { type: sub[2], label: sub[3] || sub[1] };
        }
        field.arrayFields = subFields;
      }
    }

    // Extract min/max for number fields
    if (fieldType === "number") {
      const afterField = fieldsStr.substring(fieldMatch.index, fieldMatch.index + 200);
      const minMatch = afterField.match(/min:\s*(\d+)/);
      const maxMatch = afterField.match(/max:\s*(\d+)/);
      if (minMatch) field.min = Number(minMatch[1]);
      if (maxMatch) field.max = Number(maxMatch[1]);
    }

    schema.fields[fieldName] = field;
  }

  // Fields can also be produced by a helper — `image: imageField("Photo")`,
  // `oldItems: itemArray("Old items")`. We can't know their shape without
  // evaluating the module, but we can record that the prop exists, which
  // is what a client needs in order to send it.
  for (const entry of splitTopLevel(fieldsStr)) {
    const call = entry
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
      .trim()
      .match(/^["']?([\w$]+)["']?\s*:\s*[\w$.]+\s*\(/);
    if (!call) continue;
    const name = call[1];
    if (schema.fields[name]) continue;
    schema.fields[name] = { type: "custom", label: name };
  }

  return schema;
}

/**
 * Scan a directory for *Block.jsx / *Block.js files and parse each.
 */
function scanBlockDir(dir) {
  const blocks = {};
  if (!existsSync(dir)) return blocks;

  try {
    const files = readdirSync(dir);
    for (const file of files) {
      if (!file.match(/Block\.(jsx|js)$/)) continue;
      const blockName = file.replace(/\.(jsx|js)$/, "");
      try {
        const source = readFileSync(join(dir, file), "utf-8");
        blocks[blockName] = parseBlockSource(source, blockName, source);
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Dir not readable
  }
  return blocks;
}

/**
 * Recursively find all block definitions under a directory.
 * Finds both *Block.jsx files AND any .jsx/.js file that exports a *Block.
 */
function scanBlockDirRecursive(dir) {
  const blocks = {};
  const aliases = {};
  if (!existsSync(dir)) return { blocks, aliases };

  function walk(d) {
    try {
      const entries = readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(d, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".next") continue;
          walk(fullPath);
        } else if (entry.name.match(/\.(jsx|js)$/)) {
          try {
            const source = readFileSync(fullPath, "utf-8");

            Object.assign(aliases, parseRegistryAliases(source));

            if (entry.name.match(/Block\.(jsx|js)$/)) {
              // File named *Block.jsx — parse directly
              const blockName = entry.name.replace(/\.(jsx|js)$/, "");
              blocks[blockName] = parseBlockSource(source, blockName, source);
            }

            // Also look for exported *Block constants in any file
            // Matches: export const FooBlock = { ... }
            const exportMatches = source.matchAll(
              /export\s+(?:const|let|var)\s+(\w+Block)\s*=\s*\{/g,
            );
            for (const m of exportMatches) {
              const blockName = m[1];
              if (blocks[blockName]) continue; // Already found via filename
              // Extract the block definition starting from this export
              const startIdx = m.index;
              blocks[blockName] = parseBlockSource(
                source.substring(startIdx),
                blockName,
                source,
              );
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    } catch {
      // Dir not readable
    }
  }
  walk(dir);
  return { blocks, aliases };
}

/**
 * Extract categories from a plugin's index.js source.
 */
function parseCategoriesFromSource(source) {
  const categories = {};
  const catBlock = source.match(/categories:\s*\{([\s\S]*?)\n\s{4}\},/);
  if (!catBlock) return categories;

  // Match each category entry: "key": { title: "...", components: [...] }
  const catPattern = /"([^"]+)":\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = catPattern.exec(catBlock[1])) !== null) {
    const key = m[1];
    const body = m[2];
    const titleMatch = body.match(/title:\s*"([^"]*)"/);
    const compsMatch = body.match(/components:\s*\[([\s\S]*?)\]/);
    const title = titleMatch ? titleMatch[1] : key;
    const comps = compsMatch
      ? [...compsMatch[1].matchAll(/"(\w+)"/g)].map((c) => c[1])
      : [];
    categories[key] = { title, components: comps };
  }
  return categories;
}

/**
 * Extract rootFields from plugin source (e.g. SEO plugin).
 */
function parseRootFieldsFromSource(source) {
  const rootFields = {};
  const rfBlock = source.match(/rootFields:\s*\{([\s\S]*?)\n\s{4}\},/);
  if (!rfBlock) return rootFields;

  // Split into individual field blocks by matching field definitions
  const fieldBlocks = rfBlock[1].split(/\n\s{6}(?=\w+:\s*\{)/);
  for (const block of fieldBlocks) {
    const nameMatch = block.match(/^(\w+):\s*\{/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const typeMatch = block.match(/type:\s*"(\w+)"/);
    const labelMatch = block.match(/label:\s*"([^"]*)"/);
    if (!typeMatch) continue;

    const field = { type: typeMatch[1], label: labelMatch ? labelMatch[1] : name };

    if (typeMatch[1] === "select" || typeMatch[1] === "radio") {
      const optMatch = block.match(/options:\s*\[([\s\S]*?)\]/);
      if (optMatch) {
        field.options = [...optMatch[1].matchAll(/\{\s*label:\s*"([^"]*)",\s*value:\s*"([^"]*)"\s*\}/g)]
          .map((o) => ({ label: o[1], value: o[2] }));
      }
    }
    rootFields[name] = field;
  }
  return rootFields;
}

/**
 * Return the body of the object literal whose opening brace sits at
 * `openIdx`, or null when the braces never balance.
 */
function extractObjectBody(source, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(openIdx + 1, i);
    }
  }
  return null;
}

/**
 * Split an object-literal body on its top-level commas, ignoring the
 * ones nested inside braces, brackets or parens.
 */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "{" || ch === "[" || ch === "(") depth++;
    else if (ch === "}" || ch === "]" || ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts;
}

/**
 * Map every named import to the basename of the module it came from:
 * `import { buildLanguageSwitcherBlock } from "./blocks/LanguageSwitcherBlock.jsx"`
 * yields { buildLanguageSwitcherBlock: "LanguageSwitcherBlock" }. That
 * basename is how file scanning keys the block a factory returns.
 */
function parseImportSources(source) {
  const imports = {};
  const pattern = /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;
  let m;
  while ((m = pattern.exec(source)) !== null) {
    const base = m[2].split("/").pop().replace(/\.(jsx|js)$/, "");
    for (const raw of m[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/).pop().trim();
      if (name) imports[name] = base;
    }
  }
  return imports;
}

/**
 * Parse a block *registry* — the object literal a site or plugin hands
 * to Puck as its components map. Its keys are the block type names that
 * end up stored in page content; its values are the imported block
 * definitions, and those export names are what file scanning keys
 * blocks by.
 *
 * `{ HeroSection: HeroSectionBlock }` therefore means the real block
 * type is "HeroSection" — writing "HeroSectionBlock" into a page would
 * store a type the front end can't render. Returns the mapping as
 * { registryKey: exportedName } so discovery can rename accordingly.
 */
function parseRegistryAliases(source) {
  const aliases = {};
  const imports = parseImportSources(source);
  // `const baseBlocks = {`, `const allBlocks = {`, `blocks: {`, `components: {`
  const declPattern = /(?:(?:export\s+)?(?:const|let|var)\s+\w*[Bb]locks\s*=\s*|\b(?:blocks|components)\s*:\s*)\{/g;
  let decl;
  while ((decl = declPattern.exec(source)) !== null) {
    const openIdx = decl.index + decl[0].length - 1;
    const body = extractObjectBody(source, openIdx);
    if (body === null) continue;
    // Strip comments before splitting — a comma inside a comment would
    // otherwise tear an entry in half.
    const clean = body
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    for (let entry of splitTopLevel(clean)) {
      entry = entry.trim();
      if (!entry || entry.startsWith("...")) continue;

      // `HeroSection: HeroSectionBlock`
      const pair = entry.match(/^["']?([\w$]+)["']?\s*:\s*([\w$]+)$/);
      if (pair) {
        aliases[pair[1]] = pair[2];
        continue;
      }
      // `LanguageSwitcher: buildLanguageSwitcherBlock({ ... })` — a block
      // built by a factory. The definition lives in the file the factory
      // was imported from, which is what file scanning keyed it by.
      const factory = entry.match(/^["']?([\w$]+)["']?\s*:\s*([\w$]+)\s*\(/);
      if (factory) {
        aliases[factory[1]] = imports[factory[2]] || factory[2];
        continue;
      }
      const shorthand = entry.match(/^([\w$]+)$/);
      if (shorthand) aliases[shorthand[1]] = shorthand[1];
    }
  }
  return aliases;
}

/**
 * Re-key discovered blocks onto the names the registry actually uses,
 * and drop the export names that the registry renamed away — writing
 * to those would store an unrenderable block type.
 */
function applyRegistryAliases(blocks, aliases) {
  const registryKeys = new Set(Object.keys(aliases));
  for (const [key, exportName] of Object.entries(aliases)) {
    if (key === exportName) continue;
    if (blocks[exportName] && !blocks[key]) blocks[key] = blocks[exportName];
  }
  for (const [key, exportName] of Object.entries(aliases)) {
    if (key === exportName) continue;
    // The export may itself be registered under its own name elsewhere.
    if (registryKeys.has(exportName)) continue;
    delete blocks[exportName];
  }
}

/**
 * Every installed @premast plugin that can contribute blocks. Scanning
 * the scope directory rather than a hardcoded list means a newly
 * installed plugin's blocks show up without a plugin release.
 */
function premastPluginDirs(cwd) {
  const scope = resolve(cwd, "node_modules/@premast");
  if (!existsSync(scope)) return [];
  const dirs = [];
  try {
    for (const name of readdirSync(scope)) {
      if (!name.startsWith("site-plugin-")) continue;
      dirs.push({
        blocksDir: join(scope, name, "src/blocks"),
        indexFile: join(scope, name, "src/index.js"),
      });
    }
  } catch {
    // Scope dir not readable
  }
  return dirs;
}

/**
 * Discover all available blocks automatically by scanning source files.
 * No DB sync needed — reads directly from disk.
 *
 * Sources:
 * 1. Installed @premast plugin packages (node_modules)
 * 2. Site's own block files (components/**)
 * 3. The site's Puck config, which decides each block's final type name
 */
export async function discoverAllBlocks() {
  const cwd = process.cwd();
  const blocks = {};
  const categories = {};
  let rootFields = {};

  // Registry key -> exported block name, collected as we go.
  const aliases = {};

  // 1. Scan plugin block source files from node_modules
  for (const { blocksDir, indexFile } of premastPluginDirs(cwd)) {
    const pluginBlocks = scanBlockDir(blocksDir);

    let indexSource = null;
    if (existsSync(indexFile)) {
      try {
        indexSource = readFileSync(indexFile, "utf-8");
      } catch {
        // Skip unreadable index
      }
    }

    for (const [name, schema] of Object.entries(pluginBlocks)) {
      // A plugin can ship block files it never registers (dead code, or
      // a block wired up elsewhere). Only offer the ones its entry point
      // actually references — otherwise we advertise unplaceable types.
      if (indexSource && !new RegExp(`\\b${name}\\b`).test(indexSource)) continue;
      blocks[name] = schema;
    }

    // Parse categories and the plugin's own block registry from its index
    if (indexSource) {
      Object.assign(categories, parseCategoriesFromSource(indexSource));
      Object.assign(aliases, parseRegistryAliases(indexSource));
    }
  }

  // 2. Scan SEO plugin for rootFields
  const seoIndex = resolve(cwd, "node_modules/@premast/site-plugin-seo/src/index.js");
  if (existsSync(seoIndex)) {
    try {
      const source = readFileSync(seoIndex, "utf-8");
      rootFields = parseRootFieldsFromSource(source);
    } catch {
      // Skip
    }
  }

  // 3. Scan site's own block files recursively
  const siteBlockDirs = [
    resolve(cwd, "components"),
  ];
  const siteBlockNames = new Set();
  const siteAliases = {};
  for (const dir of siteBlockDirs) {
    const site = scanBlockDirRecursive(dir);
    // Site blocks override package blocks
    Object.assign(blocks, site.blocks);
    Object.assign(siteAliases, site.aliases);
    for (const name of Object.keys(site.blocks)) siteBlockNames.add(name);
  }

  // 4. The site's Puck config is where blocks get their final names —
  //    e.g. `HeroSection: HeroSectionBlock`. Read it last so its keys win.
  for (const file of ["puck.config.js", "puck.config.jsx", "site.config.js", "site.config.jsx"]) {
    const configPath = resolve(cwd, file);
    if (!existsSync(configPath)) continue;
    try {
      Object.assign(siteAliases, parseRegistryAliases(readFileSync(configPath, "utf-8")));
    } catch {
      // Skip unreadable config
    }
  }

  // Rename discovered blocks onto the types actually stored in content.
  Object.assign(aliases, siteAliases);
  applyRegistryAliases(blocks, aliases);

  // Scanning components/** also turns up block definitions the site
  // never registers — leftovers from the starter, or helpers used inside
  // another block. Once we've read the site's own registry, drop them:
  // offering a type Puck can't render is how unrenderable content gets
  // written. If we couldn't read that registry we keep every candidate,
  // since a short list is only useful when it's the accurate one.
  if (Object.keys(siteAliases).length > 0) {
    for (const name of siteBlockNames) {
      if (siteAliases[name] === undefined) delete blocks[name];
    }
  }

  // 5. Fallback: try DB manifest if no blocks found from files
  if (Object.keys(blocks).length === 0) {
    try {
      const mongoose = await import("mongoose");
      if (mongoose.default.connection.readyState === 1) {
        const manifest = await mongoose.default.connection.db
          .collection("blockmanifests")
          .findOne({ key: "default" });
        if (manifest) {
          Object.assign(blocks, manifest.blocks || {});
          Object.assign(categories, manifest.categories || {});
          rootFields = manifest.rootFields || {};
        }
      }
    } catch {
      // No DB fallback available
    }
  }

  return { blocks, categories, rootFields };
}

/**
 * Block types that exist at runtime but are declared in no source file.
 * The symbols plugin registers one Puck component per reusable
 * component (`SymbolRef_<id>`), so stored content legitimately contains
 * types discovery can never see.
 */
const RUNTIME_BLOCK_TYPES = [/^SymbolRef_/];

/**
 * Validate Puck content JSON against discovered block schemas.
 * Returns { valid: true } or { valid: false, errors: [...] }, plus any
 * non-fatal `warnings`.
 *
 * Only problems that would store unrenderable content are errors — an
 * unknown block type, or content that isn't an array of blocks. Field
 * checks are advisory: block schemas are recovered by reading source
 * with regex, and fields built by a helper (`image: imageField(...)`)
 * or spread from a shared object can't be seen that way. Failing a
 * write on them would reject a page's own props read back seconds
 * earlier, which is worse than the mistakes it would catch.
 */
export function validatePuckContent(content, blockSchemas) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(content)) {
    return { valid: false, errors: ["content must be an array of block objects"] };
  }

  for (let i = 0; i < content.length; i++) {
    const block = content[i];
    if (!block || typeof block !== "object") {
      errors.push(`content[${i}]: must be an object`);
      continue;
    }
    if (!block.type) {
      errors.push(`content[${i}]: missing "type" field`);
      continue;
    }

    const schema = blockSchemas[block.type];
    if (!schema) {
      if (RUNTIME_BLOCK_TYPES.some((re) => re.test(block.type))) continue;
      errors.push(
        `content[${i}]: unknown block type "${block.type}". Available: ${Object.keys(blockSchemas).join(", ")}`,
      );
      continue;
    }

    // Validate props against schema fields
    const props = block.props || {};
    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      // Check slot fields recursively
      if (fieldDef.type === "slot" && props[fieldName] != null) {
        const slotContent = Array.isArray(props[fieldName])
          ? props[fieldName]
          : [];
        const slotResult = validatePuckContent(slotContent, blockSchemas);
        if (!slotResult.valid) {
          for (const err of slotResult.errors) {
            errors.push(`content[${i}].props.${fieldName} > ${err}`);
          }
        }
        for (const warn of slotResult.warnings || []) {
          warnings.push(`content[${i}].props.${fieldName} > ${warn}`);
        }
      }

      // Check select/radio values against options
      if (
        (fieldDef.type === "select" || fieldDef.type === "radio") &&
        fieldDef.options?.length &&
        props[fieldName] !== undefined
      ) {
        const validValues = fieldDef.options.map((o) =>
          typeof o === "object" ? o.value : o,
        );
        // Compare as strings: an option can be a boolean or a number,
        // and JSON round-tripping doesn't always preserve which.
        const asText = validValues.map((v) => String(v));
        if (!asText.includes(String(props[fieldName]))) {
          warnings.push(
            `content[${i}].props.${fieldName}: unexpected value "${props[fieldName]}". Known: ${asText.join(", ")}`,
          );
        }
      }
    }

    // Warn about unknown props (non-blocking)
    for (const propName of Object.keys(props)) {
      if (propName === "id") continue; // Puck internal
      if (!schema.fields[propName]) {
        warnings.push(
          `content[${i}].props.${propName}: not in the parsed schema for block type "${block.type}"`,
        );
      }
    }
  }

  return errors.length === 0
    ? { valid: true, warnings }
    : { valid: false, errors, warnings };
}
