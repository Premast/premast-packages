import { injectors } from "./injectors/index.js";

/**
 * The single generic seam for rendering site-wide settings into the public site.
 * Wire it ONCE into the public layout (`app/(site)/layout.jsx`):
 *
 *   import { PremastSiteSettings } from "@premast/site-core/site-settings";
 *   <PremastSiteSettings siteConfig={siteConfig} />
 *
 * It reads SiteSettings once and runs every registered injector (analytics
 * today; future settings add an injector, not another layout edit). Server
 * component — never ship it into the admin (it would track the CMS).
 *
 * @param {object} props
 * @param {object} props.siteConfig - the createSiteConfig() result
 */
export async function PremastSiteSettings({ siteConfig }) {
  let settings = {};
  try {
    const connectDB = await siteConfig.getConnectDB();
    await connectDB();
    const models = await siteConfig.getModels();
    const { SiteSettings } = models;
    const docs = await SiteSettings.find({}).lean();
    settings = Object.fromEntries(docs.map((d) => [d.key, d.value]));
  } catch {
    // DB offline / not configured — render nothing rather than crash the page.
    return null;
  }

  const nodes = [];
  for (const injector of injectors) {
    try {
      const out = injector(settings);
      if (out) nodes.push(...(Array.isArray(out) ? out : [out]));
    } catch (e) {
      console.error("[premast] site-settings injector failed:", e);
    }
  }

  if (!nodes.length) return null;
  return <>{nodes}</>;
}
