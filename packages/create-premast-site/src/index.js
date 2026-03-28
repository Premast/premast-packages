#!/usr/bin/env node

import * as p from "@clack/prompts";
import pc from "picocolors";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from "fs";
import { execSync, spawn } from "child_process";

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

/** Run a command asynchronously so the spinner keeps animating. */
function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "pipe", shell: true });
    let stderr = "";
    child.stderr?.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `${cmd} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isDevMode = args.includes("--dev");

  // --dev: resolve the monorepo root so we can create file: links
  let monorepoRoot = null;
  if (isDevMode) {
    // CLI source lives at premast-packages/packages/create-premast-site/src/index.js
    monorepoRoot = resolve(__dirname, "../../..");
    if (!existsSync(join(monorepoRoot, "packages/site-core"))) {
      // Fallback: maybe running from node_modules, try finding it
      monorepoRoot = null;
    }
    if (!monorepoRoot) {
      console.error(pc.red("--dev requires running from the premast-packages monorepo source."));
      console.error(pc.dim("Usage: node packages/create-premast-site/src/index.js --dev"));
      process.exit(1);
    }
  }

  console.log();
  p.intro(pc.bgCyan(pc.black(isDevMode ? " create-premast-site (dev mode) " : " create-premast-site ")));

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

  // Replace workspace:* with published versions or file: links
  const packageDirMap = {
    "@premast/site-core": "site-core",
    "@premast/site-blocks": "site-blocks",
    "@premast/site-plugin-seo": "site-plugin-seo",
  };

  for (const dep of Object.keys(pkg.dependencies)) {
    if (pkg.dependencies[dep] === "workspace:*") {
      if (isDevMode && monorepoRoot && packageDirMap[dep]) {
        // Use relative file: link to monorepo package
        const relPath = join(monorepoRoot, "packages", packageDirMap[dep]);
        pkg.dependencies[dep] = `file:${relPath}`;
      } else {
        pkg.dependencies[dep] = "^0.2.0";
      }
    }
  }

  // Replace workspace:* in devDependencies too
  if (pkg.devDependencies) {
    for (const dep of Object.keys(pkg.devDependencies)) {
      if (pkg.devDependencies[dep] === "workspace:*") {
        if (isDevMode && monorepoRoot && dep === "@premast/create-premast-site") {
          const relPath = join(monorepoRoot, "packages", "create-premast-site");
          pkg.devDependencies[dep] = `file:${relPath}`;
        } else {
          pkg.devDependencies[dep] = "^0.2.0";
        }
      }
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
    if (isDevMode && monorepoRoot && packageDirMap[plugin.value]) {
      const relPath = join(monorepoRoot, "packages", packageDirMap[plugin.value]);
      pkg.dependencies[plugin.value] = `file:${relPath}`;
    } else {
      pkg.dependencies[plugin.value] = "^0.2.0";
    }
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

  // 5. Create .env.local from example + generate AUTH_SECRET
  const envExamplePath = join(projectDir, ".env.local.example");
  const envPath = join(projectDir, ".env.local");
  if (existsSync(envExamplePath)) {
    let envContent = readFileSync(envExamplePath, "utf-8");
    envContent = envContent.replace(
      "MONGODB_DB_NAME=premast_starter",
      `MONGODB_DB_NAME=${projectName.replace(/[^a-z0-9]/g, "_")}`,
    );
    // Generate a random AUTH_SECRET for JWT signing
    const { randomBytes } = await import("crypto");
    const authSecret = randomBytes(32).toString("hex");
    envContent += `\nAUTH_SECRET=${authSecret}\n`;
    writeFileSync(envPath, envContent);
  }

  // 5b. Write .premast.json metadata (used by premast-update)
  const premastMeta = {
    templateVersion: pkg.dependencies["@premast/site-core"]?.replace(/^\^/, "") || "0.2.0",
    createdAt: new Date().toISOString(),
    lastUpdate: null,
  };
  writeFileSync(
    join(projectDir, ".premast.json"),
    JSON.stringify(premastMeta, null, 2) + "\n",
  );

  s.stop("Project configured.");

  // 6. Install dependencies
  const packageManager = detectPackageManager();

  // Check if GITHUB_TOKEN is available (needed for @premast packages on GitHub Packages)
  // In dev mode, packages use file: links so no token is needed.
  if (!isDevMode && !process.env.GITHUB_TOKEN) {
    p.log.warn(
      pc.yellow("GITHUB_TOKEN is not set. ") +
      "It's required to install @premast packages from GitHub Packages.\n" +
      pc.dim("  Set it with: export GITHUB_TOKEN=ghp_your_token_here\n") +
      pc.dim("  Or add it to the .npmrc file in the project.")
    );
  }

  s.start(`Installing dependencies with ${packageManager}... ${pc.dim("(this may take a minute)")}`);

  try {
    await runCommand(packageManager, ["install"], projectDir);
    s.stop("Dependencies installed.");
  } catch {
    s.stop(pc.yellow("Dependency install failed — run it manually after setup."));
  }

  // 7. Initialize git
  s.start("Initializing git repository...");
  try {
    await runCommand("git", ["init"], projectDir);
    await runCommand("git", ["add", "-A"], projectDir);
    await runCommand("git", ["commit", "-m", "Initial commit from create-premast-site"], projectDir);
    s.stop("Git repository initialized.");
  } catch {
    s.stop(pc.yellow("Git init failed — initialize manually if needed."));
  }

  // Done
  const devNote = isDevMode
    ? [
        "",
        pc.yellow("# DEV MODE — using local file: links"),
        "# Changes in premast-packages are picked up by HMR.",
        "# Must use --webpack (already set in dev script).",
      ]
    : [
        "",
        "# To update Premast packages later:",
        `${packageManager === "npm" ? "npm run" : packageManager} update`,
      ];

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
      "",
      "# Create your first admin account at:",
      "# http://localhost:3000/admin/setup",
      ...devNote,
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

  return `import { resolve, dirname } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Alias antd so @premast packages share the client's single copy.
// Do NOT alias react/react-dom — breaks Next.js edge middleware.
const sharedDeps = ["antd", "@ant-design/icons"];
const webpackAliases = Object.fromEntries(
  sharedDeps.map((dep) => [
    dep,
    resolve(dirname(require.resolve(\`\${dep}/package.json\`))),
  ])
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mongoose"],
  transpilePackages: [
${packages.join("\n")}
  ],
  turbopack: {},
  webpack(config) {
    Object.assign(config.resolve.alias, webpackAliases);
    return config;
  },
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

// If --update flag is passed, run the update flow instead
if (process.argv.includes("--update")) {
  import("./update.js");
} else {
  main().catch((err) => {
    console.error(pc.red("Error:"), err.message);
    process.exit(1);
  });
}
