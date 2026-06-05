import { analyticsInjector } from "./analytics.jsx";

/**
 * Registry of site-wide setting injectors. Each is `(settings) => ReactNode|null`
 * where `settings` is the full `{ key: value }` map from SiteSettings. To add a
 * future site-wide setting that renders into the public layout (cookie consent,
 * custom global CSS, favicon, maintenance banner…), add an injector here — no
 * per-site layout wiring needed.
 */
export const injectors = [analyticsInjector];
