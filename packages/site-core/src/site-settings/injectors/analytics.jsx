import {
  gaInit,
  gtmInit,
  gtmNoscriptSrc,
  posthogInit,
  metaPixelInit,
  metaPixelNoscriptSrc,
  hotjarInit,
  linkedinInit,
  linkedinNoscriptSrc,
} from "./analytics-snippets.js";

const inline = (key, js) => <script key={key} dangerouslySetInnerHTML={{ __html: js }} />;

// Wrap arbitrary user HTML so it renders without an extra layout box. Note: this
// renders at the seam's position (inside <body>), so it suits scripts/widgets —
// not <head>-only tags. React only hoists real <script async>/<link>/<meta>
// *elements* to <head>, which is why the named-provider loaders reach <head> but
// a raw HTML string here does not.
const rawHtml = (key, html) => (
  <div key={key} style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />
);

/**
 * Analytics / marketing-tag injector. Reads the `integrations` SiteSettings
 * value and returns the script + noscript nodes for every enabled provider,
 * plus any custom head/body HTML. `<script async src>` elements are hoisted to
 * <head> by React; inline init scripts run where rendered (body-start).
 *
 * @param {object} settings - map of all SiteSettings { key: value }
 * @returns {Array|null} React nodes, or null when nothing is configured
 */
export function analyticsInjector(settings) {
  const cfg = settings?.integrations;
  if (!cfg || typeof cfg !== "object") return null;

  const nodes = [];

  const ga = cfg.googleAnalytics;
  if (ga?.enabled && ga.measurementId) {
    nodes.push(
      <script
        key="ga-src"
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga.measurementId)}`}
      />,
      inline("ga-init", gaInit(ga.measurementId)),
    );
  }

  const gtm = cfg.googleTagManager;
  if (gtm?.enabled && gtm.containerId) {
    nodes.push(inline("gtm-init", gtmInit(gtm.containerId)));
    nodes.push(
      <noscript key="gtm-noscript">
        <iframe
          src={gtmNoscriptSrc(gtm.containerId)}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="gtm"
        />
      </noscript>,
    );
  }

  const ph = cfg.posthog;
  if (ph?.enabled && ph.apiKey) {
    nodes.push(inline("posthog-init", posthogInit(ph.apiKey, ph.apiHost)));
  }

  const meta = cfg.metaPixel;
  if (meta?.enabled && meta.pixelId) {
    nodes.push(inline("meta-init", metaPixelInit(meta.pixelId)));
    nodes.push(
      <noscript key="meta-noscript">
        <img height="1" width="1" style={{ display: "none" }} alt="" src={metaPixelNoscriptSrc(meta.pixelId)} />
      </noscript>,
    );
  }

  const hj = cfg.hotjar;
  if (hj?.enabled && hj.siteId) {
    nodes.push(inline("hotjar-init", hotjarInit(hj.siteId)));
  }

  const li = cfg.linkedin;
  if (li?.enabled && li.partnerId) {
    nodes.push(inline("linkedin-init", linkedinInit(li.partnerId)));
    nodes.push(
      <noscript key="linkedin-noscript">
        <img height="1" width="1" style={{ display: "none" }} alt="" src={linkedinNoscriptSrc(li.partnerId)} />
      </noscript>,
    );
  }

  // Single custom-HTML slot (legacy customHeadHtml/customBodyHtml still honored).
  const customHtml =
    cfg.customHtml ?? [cfg.customHeadHtml, cfg.customBodyHtml].filter(Boolean).join("\n");
  if (customHtml) nodes.push(rawHtml("custom-html", customHtml));

  return nodes.length ? nodes : null;
}
