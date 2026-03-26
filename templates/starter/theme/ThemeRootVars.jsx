import { getRootCssVariablesCss } from "@premast/site-core/theme";
import { designTokens } from "./tokens";

export function ThemeRootVars() {
  return (
    <style dangerouslySetInnerHTML={{ __html: getRootCssVariablesCss(designTokens) }} />
  );
}
