import { getRootCssVariablesCss } from "./css-vars.js";

export function ThemeRootVars({ tokens }) {
  return (
    <style dangerouslySetInnerHTML={{ __html: getRootCssVariablesCss(tokens) }} />
  );
}
