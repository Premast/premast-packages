/**
 * Editor-only exports for the symbols plugin.
 *
 * Safe for the browser bundle — no mongoose. Use these if you build the
 * client Puck config by hand in puck.config.js; otherwise the plugin
 * object from ./index.js already carries `blocks` and `fieldTypes`.
 */
export { SymbolPickerField } from "./fields/SymbolPickerField.jsx";
export { symbolBlock } from "./blocks/SymbolBlock.jsx";

// Registers every published component as its own palette block. Swap
// this in for `PuckConfigProvider` in app/admin/(dashboard)/PuckProvider.jsx.
export { SymbolsPuckConfigProvider } from "./editor/SymbolsPuckConfigProvider.jsx";
export {
  withSymbolComponents,
  symbolIdFromType,
  typeForSymbolId,
} from "./editor/augment-config.js";
export { SYMBOL_BLOCK_TYPE, SYMBOL_REF_PREFIX } from "./constants.js";

import { SymbolPickerField } from "./fields/SymbolPickerField.jsx";

export const symbolFieldTypes = {
  symbol: SymbolPickerField,
};
