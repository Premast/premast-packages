/**
 * Single source of truth for design values (any client / rebrand).
 * Drives `:root` CSS variables and `theme/antd-theme.js` — keep them in sync.
 */
export const designTokens = {
  bg: "#0a0a0a",
  bgSubtle: "#101010",
  surface: "#141414",
  surfaceRaised: "#1a1a1a",
  text: "#e4e4e7",
  textMuted: "#a6a6a6",
  textTertiary: "#52525b",
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.14)",
  borderSecondary: "rgba(255, 255, 255, 0.06)",
  borderDashed: "rgba(255, 255, 255, 0.12)",
  /** Lo-fi wireframe: muted indigo primary, light text on filled accent */
  accent: "#5e6ad2",
  accentOnAccent: "#f4f4f5",
  accentMuted: "rgba(94, 106, 210, 0.35)",
  grid: "rgba(255, 255, 255, 0.035)",
  fill: "rgba(255, 255, 255, 0.06)",
  placeholderStripe: "rgba(255, 255, 255, 0.05)",
  shadowOffset: "rgba(255, 255, 255, 0.1)",
  navItemInactive: "#a6a6a6",
  buttonRadius: 8,
  fontSans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

/** Maps `:root` CSS variable names → keys on `designTokens`. */
const CSS_VAR_MAP = {
  "--theme-bg": "bg",
  "--theme-bg-subtle": "bgSubtle",
  "--theme-surface": "surface",
  "--theme-surface-raised": "surfaceRaised",
  "--theme-text": "text",
  "--theme-text-muted": "textMuted",
  "--theme-text-tertiary": "textTertiary",
  "--theme-border": "border",
  "--theme-border-strong": "borderStrong",
  "--theme-border-dashed": "borderDashed",
  "--theme-accent": "accent",
  "--theme-accent-on-accent": "accentOnAccent",
  "--theme-accent-muted": "accentMuted",
  "--theme-grid": "grid",
  "--theme-fill": "fill",
  "--theme-placeholder-stripe": "placeholderStripe",
  "--theme-shadow-offset": "shadowOffset",
  "--theme-font-sans": "fontSans",
};

/** Inline `:root { ... }` for the document (same values as `designTokens`). */
export function getRootCssVariablesCss() {
  const lines = Object.entries(CSS_VAR_MAP).map(
    ([cssVar, key]) => `  ${cssVar}: ${designTokens[key]};`,
  );
  return `:root {\n${lines.join("\n")}\n}`;
}
