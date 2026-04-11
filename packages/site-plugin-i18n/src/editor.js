/**
 * Editor-only exports for the i18n plugin.
 *
 * Import this in puck.config.js (client-side only).
 * Do NOT import in site.config.js (would pull @puckeditor/core into
 * the server bundle).
 */
export { LocaleSwitcher } from "./admin/LocaleSwitcher.jsx";
export { buildLocaleOptions, resolveLocaleMeta, getLocaleDir } from "./config.js";
