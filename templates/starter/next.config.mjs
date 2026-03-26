/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mongoose"],
  transpilePackages: [
    "@premast/site-core",
    "@premast/site-blocks",
    "@premast/site-plugin-seo",
  ],
};

export default nextConfig;
