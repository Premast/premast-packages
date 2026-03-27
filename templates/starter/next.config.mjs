import { resolve, dirname } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

/**
 * Force all @premast packages to share the client's single copies of React,
 * React-DOM, and Ant Design. Prevents dual React context issues with
 * symlinked or file:-linked packages during local development.
 *
 * When packages are installed from npm (production), this is harmless.
 * For local dev with file: links, use `next dev --webpack`.
 */
// Only alias antd — react/react-dom resolve correctly from npm
// and aliasing them breaks Next.js edge middleware runtime.
const sharedDeps = ["antd", "@ant-design/icons"];
const webpackAliases = Object.fromEntries(
  sharedDeps.map((dep) => [
    dep,
    resolve(dirname(require.resolve(`${dep}/package.json`))),
  ])
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mongoose"],
  transpilePackages: [
    "@premast/site-core",
    "@premast/site-blocks",
    // Add any @premast plugins here:
    // "@premast/site-plugin-seo",
  ],
  turbopack: {},
  webpack(config) {
    Object.assign(config.resolve.alias, webpackAliases);
    return config;
  },
};

export default nextConfig;
