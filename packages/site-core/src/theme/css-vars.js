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

export function getRootCssVariablesCss(tokens) {
  const lines = Object.entries(CSS_VAR_MAP).map(
    ([cssVar, key]) => `  ${cssVar}: ${tokens[key]};`,
  );
  return `:root {\n${lines.join("\n")}\n}`;
}
