import { SYMBOL_BLOCK_TYPE } from "../constants.js";
import { SymbolBlockPreview } from "./SymbolBlockPreview.jsx";

/**
 * The reference block. It holds only a `symbolId` — no content of its
 * own. On the front end the `beforePageRender` (expandSymbols) hook
 * replaces it with the referenced component's content, so this block's
 * `render` only ever shows inside the editor (as a placeholder). If it
 * somehow reaches a real render un-expanded, the preview renders null
 * outside the editor rather than leaking scaffolding.
 */
export const symbolBlock = {
  [SYMBOL_BLOCK_TYPE]: {
    label: "Component",
    fields: {
      symbolId: { type: "symbol", label: "Component" },
    },
    defaultProps: { symbolId: "" },
    render: ({ symbolId, puck }) => (
      <SymbolBlockPreview symbolId={symbolId} isEditing={puck?.isEditing} />
    ),
  },
};
