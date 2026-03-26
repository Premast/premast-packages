/**
 * Default admin design tokens. Clients can override any of these
 * via `createSiteConfig({ admin: { theme: { ... } } })`.
 */
export const defaultAdminTokens = {
  bg: "#0a0a0a",
  bgSubtle: "#101010",
  surface: "#141414",
  surfaceRaised: "#1a1a1a",
  text: "#e4e4e7",
  textMuted: "#a6a6a6",
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.14)",
  borderSecondary: "rgba(255, 255, 255, 0.06)",
  accent: "#5e6ad2",
  accentOnAccent: "#f4f4f5",
  accentMuted: "rgba(94, 106, 210, 0.35)",
  fill: "rgba(255, 255, 255, 0.06)",
  navItemInactive: "#a6a6a6",
  buttonRadius: 8,
  fontSans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

/**
 * Merge client overrides into admin tokens.
 * The actual Ant Design theme object is built at render time inside
 * AdminAppLayout using the client's antd instance (avoids dual-context issues).
 */
export function mergeAdminTokens(overrides = {}) {
  return { ...defaultAdminTokens, ...overrides };
}
