#!/usr/bin/env node

import * as p from "@clack/prompts";
import pc from "picocolors";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// In published package: template is bundled at ../template/ (via build:cli script)
// In monorepo dev: falls back to ../../templates/starter/
const TEMPLATE_DIR = existsSync(resolve(__dirname, "../template"))
  ? resolve(__dirname, "../template")
  : resolve(__dirname, "../../templates/starter");

/** Available plugins — add new ones here as they're created. */
const AVAILABLE_PLUGINS = [
  {
    value: "@premast/site-plugin-seo",
    label: "SEO Plugin",
    hint: "Sitemap, robots.txt, SEO blocks",
    importName: "seoPlugin",
    importPath: "@premast/site-plugin-seo",
    configCall: "seoPlugin()",
  },
  // Future plugins:
  // {
  //   value: "@premast/site-plugin-stripe",
  //   label: "Stripe Plugin",
  //   hint: "Payment pages and components",
  //   importName: "stripePlugin",
  //   importPath: "@premast/site-plugin-stripe",
  //   configCall: 'stripePlugin({ publishableKey: process.env.STRIPE_KEY })',
  // },
];

async function main() {
  console.log();
  p.intro(pc.bgCyan(pc.black(" create-premast-site ")));

  const project = await p.group(
    {
      name: () =>
        p.text({
          message: "Project name",
          placeholder: "my-client-site",
          validate: (value) => {
            if (!value?.trim()) return "Project name is required";
            if (!/^[a-z0-9][a-z0-9._-]*$/.test(value.trim()))
              return "Use lowercase letters, numbers, hyphens, dots, or underscores";
            if (existsSync(resolve(process.cwd(), value.trim())))
              return `Directory "${value.trim()}" already exists`;
          },
        }),

      plugins: () =>
        p.multiselect({
          message: "Select plugins to include",
          options: AVAILABLE_PLUGINS.map((plugin) => ({
            value: plugin.value,
            label: plugin.label,
            hint: plugin.hint,
          })),
          required: false,
        }),

      confirm: ({ results }) =>
        p.confirm({
          message: `Create ${pc.cyan(results.name)} with ${results.plugins.length || "no"} plugin${results.plugins.length === 1 ? "" : "s"}?`,
        }),
    },
    {
      onCancel: () => {
        p.cancel("Setup cancelled.");
        process.exit(0);
      },
    },
  );

  if (!project.confirm) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const projectName = project.name.trim();
  const selectedPlugins = AVAILABLE_PLUGINS.filter((pl) =>
    project.plugins.includes(pl.value),
  );
  const projectDir = resolve(process.cwd(), projectName);

  // 1. Copy template
  const s = p.spinner();
  s.start("Copying template files...");

  mkdirSync(projectDir, { recursive: true });
  cpSync(TEMPLATE_DIR, projectDir, { recursive: true });

  s.stop("Template copied.");

  // 2. Customize package.json
  s.start("Configuring project...");

  const pkgPath = join(projectDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

  pkg.name = projectName;

  // Replace workspace:* with ^0.1.0 for standalone projects
  for (const dep of Object.keys(pkg.dependencies)) {
    if (pkg.dependencies[dep] === "workspace:*") {
      pkg.dependencies[dep] = "^0.1.0";
    }
  }

  // Remove plugins not selected
  for (const plugin of AVAILABLE_PLUGINS) {
    if (!project.plugins.includes(plugin.value)) {
      delete pkg.dependencies[plugin.value];
    }
  }

  // Add selected plugin dependencies
  for (const plugin of selectedPlugins) {
    pkg.dependencies[plugin.value] = "^0.1.0";
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  // 3. Generate site.config.js
  const siteConfigPath = join(projectDir, "site.config.js");
  const siteConfig = generateSiteConfig(selectedPlugins, projectName);
  writeFileSync(siteConfigPath, siteConfig);

  // 4. Generate next.config.mjs with correct transpilePackages
  const nextConfigPath = join(projectDir, "next.config.mjs");
  const nextConfig = generateNextConfig(selectedPlugins);
  writeFileSync(nextConfigPath, nextConfig);

  // 5. Create .env.local from example
  const envExamplePath = join(projectDir, ".env.local.example");
  const envPath = join(projectDir, ".env.local");
  if (existsSync(envExamplePath)) {
    let envContent = readFileSync(envExamplePath, "utf-8");
    envContent = envContent.replace(
      "MONGODB_DB_NAME=premast_starter",
      `MONGODB_DB_NAME=${projectName.replace(/[^a-z0-9]/g, "_")}`,
    );
    writeFileSync(envPath, envContent);
  }

  s.stop("Project configured.");

  // 6. Install dependencies
  const packageManager = detectPackageManager();
  s.start(`Installing dependencies with ${packageManager}...`);

  try {
    execSync(`${packageManager} install`, {
      cwd: projectDir,
      stdio: "pipe",
    });
    s.stop("Dependencies installed.");
  } catch {
    s.stop(pc.yellow("Dependency install failed — run it manually after setup."));
  }

  // 7. Initialize git
  s.start("Initializing git...");
  try {
    execSync("git init", { cwd: projectDir, stdio: "pipe" });
    execSync("git add -A", { cwd: projectDir, stdio: "pipe" });
    execSync('git commit -m "Initial commit from create-premast-site"', {
      cwd: projectDir,
      stdio: "pipe",
    });
    s.stop("Git initialized.");
  } catch {
    s.stop(pc.yellow("Git init failed — initialize manually if needed."));
  }

  // Done
  p.note(
    [
      `cd ${projectName}`,
      "",
      "# Configure your MongoDB connection:",
      `# Edit ${projectName}/.env.local`,
      "",
      "# Start the dev server:",
      `${packageManager === "npm" ? "npm run" : packageManager} dev`,
      "",
      "# Open in browser:",
      "# Site:  http://localhost:3000",
      "# Admin: http://localhost:3000/admin",
    ].join("\n"),
    "Next steps",
  );

  p.outro(pc.green("Your Premast site is ready!"));
}

function generateSiteConfig(selectedPlugins, projectName) {
  const imports = [
    'import { createSiteConfig } from "@premast/site-core";',
    'import { baseBlocks, baseCategories } from "@premast/site-blocks";',
  ];

  for (const plugin of selectedPlugins) {
    imports.push(
      `import { ${plugin.importName} } from "${plugin.importPath}";`,
    );
  }

  const pluginCalls = selectedPlugins.map((pl) => `    ${pl.configCall},`);
  const pluginsArray =
    pluginCalls.length > 0
      ? `\n${pluginCalls.join("\n")}\n  `
      : "";

  const title = projectName
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return `${imports.join("\n")}

export const siteConfig = createSiteConfig({
  blocks: baseBlocks,
  categories: baseCategories,
  plugins: [${pluginsArray}],
  admin: {
    title: "${title} CMS",
  },
});
`;
}

function generateNextConfig(selectedPlugins) {
  const packages = [
    '    "@premast/site-core",',
    '    "@premast/site-blocks",',
    ...selectedPlugins.map((pl) => `    "${pl.value}",`),
  ];

  return `/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mongoose"],
  transpilePackages: [
${packages.join("\n")}
  ],
};

export default nextConfig;
`;
}

function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent || "";
  if (userAgent.startsWith("pnpm")) return "pnpm";
  if (userAgent.startsWith("yarn")) return "yarn";
  return "npm";
}

main().catch((err) => {
  console.error(pc.red("Error:"), err.message);
  process.exit(1);
});
