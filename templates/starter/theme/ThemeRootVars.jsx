import { getRootCssVariablesCss } from "./tokens";

/** Injects `:root` CSS variables from `designTokens` in theme/tokens.js (server-safe). */
export function ThemeRootVars() {
  return (
    <style
      // eslint-disable-next-line react/no-danger -- controlled token string from theme/tokens.js
      dangerouslySetInnerHTML={{ __html: getRootCssVariablesCss() }}
    />
  );
}
