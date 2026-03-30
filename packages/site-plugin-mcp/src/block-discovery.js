import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, join } from "path";

/**
 * Parse a .jsx/.js block file and extract fields, defaultProps, and label
 * using regex. Works without JSX transpilation.
 */
function parseBlockSource(source, blockName) {
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
  const fieldsStr = fieldsBlockMatch ? fieldsBlockMatch[1] : source;

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
        const optEntries = optionsMatch[1].matchAll(/\{\s*label:\s*"([^"]*)",\s*value:\s*"([^"]*)"\s*\}/g);
        field.options = [...optEntries].map((o) => ({ label: o[1], value: o[2] }));
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
        blocks[blockName] = parseBlockSource(source, blockName);
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
  if (!existsSync(dir)) return blocks;

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

            if (entry.name.match(/Block\.(jsx|js)$/)) {
              // File named *Block.jsx — parse directly
              const blockName = entry.name.replace(/\.(jsx|js)$/, "");
              blocks[blockName] = parseBlockSource(source, blockName);
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
  return blocks;
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
 * Discover all available blocks automatically by scanning source files.
 * No DB sync needed — reads directly from disk.
 *
 * Sources:
 * 1. Installed @premast plugin packages (node_modules)
 * 2. Site's own block files (components/**)
 */
export async function discoverAllBlocks() {
  const cwd = process.cwd();
  const blocks = {};
  const categories = {};
  let rootFields = {};

  // 1. Scan plugin block source files from node_modules
  const pluginDirs = [
    {
      blocksDir: resolve(cwd, "node_modules/@premast/site-plugin-ui/src/blocks"),
      indexFile: resolve(cwd, "node_modules/@premast/site-plugin-ui/src/index.js"),
    },
    {
      blocksDir: resolve(cwd, "node_modules/@premast/site-plugin-mcp/src/blocks"),
      indexFile: resolve(cwd, "node_modules/@premast/site-plugin-mcp/src/index.js"),
    },
  ];

  for (const { blocksDir, indexFile } of pluginDirs) {
    const pluginBlocks = scanBlockDir(blocksDir);
    Object.assign(blocks, pluginBlocks);

    // Parse categories from plugin index
    if (existsSync(indexFile)) {
      try {
        const source = readFileSync(indexFile, "utf-8");
        Object.assign(categories, parseCategoriesFromSource(source));
      } catch {
        // Skip
      }
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
  for (const dir of siteBlockDirs) {
    const siteBlocks = scanBlockDirRecursive(dir);
    // Site blocks override package blocks
    Object.assign(blocks, siteBlocks);
  }

  // 4. Fallback: try DB manifest if no blocks found from files
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
 * Validate Puck content JSON against discovered block schemas.
 * Returns { valid: true } or { valid: false, errors: [...] }.
 */
export function validatePuckContent(content, blockSchemas) {
  const errors = [];

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
      }

      // Check select/radio values against options
      if (
        (fieldDef.type === "select" || fieldDef.type === "radio") &&
        fieldDef.options &&
        props[fieldName] !== undefined
      ) {
        const validValues = fieldDef.options.map((o) =>
          typeof o === "object" ? o.value : o,
        );
        if (!validValues.includes(props[fieldName])) {
          errors.push(
            `content[${i}].props.${fieldName}: invalid value "${props[fieldName]}". Valid: ${validValues.join(", ")}`,
          );
        }
      }
    }

    // Warn about unknown props (non-blocking)
    for (const propName of Object.keys(props)) {
      if (propName === "id") continue; // Puck internal
      if (!schema.fields[propName]) {
        errors.push(
          `content[${i}].props.${propName}: unknown field for block type "${block.type}"`,
        );
      }
    }
  }

  return errors.length === 0
    ? { valid: true }
    : { valid: false, errors };
}
