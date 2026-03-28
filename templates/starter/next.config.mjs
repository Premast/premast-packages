import { resolve, dirname } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

/**
 * Force all @premast packages to share the client's single copies of
 * Ant Design, Icons, and the Puck editor. Prevents duplicate context /
 * resolution issues with symlinked or file:-linked packages in local dev.
 *
 * When packages are installed from npm (production), this is harmless.
 */
const sharedDeps = ["antd", "@ant-design/icons"];
const aliases = Object.fromEntries(
  sharedDeps.map((dep) => [
    dep,
    resolve(dirname(require.resolve(`${dep}/package.json`))),
  ])
);

// For @puckeditor/core, alias each subpath individually so the exports field is honored.
const puckDir = dirname(require.resolve("@puckeditor/core/package.json"));
aliases["@puckeditor/core$"] = resolve(puckDir, "dist/index.mjs");
aliases["@puckeditor/core/rsc"] = resolve(puckDir, "dist/rsc.mjs");
aliases["@puckeditor/core/puck.css"] = resolve(puckDir, "dist/index.css");

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mongoose"],
  transpilePackages: [
    "@premast/site-core",
    "@premast/site-blocks",
    // Add any @premast plugins here:
    // "@premast/site-plugin-seo",
  ],
  // Note: build and dev use --webpack flag for resolve.alias support.
  // Turbopack does not support absolute-path aliases needed for pnpm.
  webpack(config) {
    Object.assign(config.resolve.alias, aliases);
    return config;
  },
};

export default nextConfig;
