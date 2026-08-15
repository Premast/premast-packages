import { symbolBlock } from "./blocks/SymbolBlock.jsx";
import { SymbolPickerField } from "./fields/SymbolPickerField.jsx";
import { SymbolsAdminPage } from "./admin/SymbolsAdminPage.jsx";

/**
 * @premast/site-plugin-symbols
 *
 * Reusable Components (Symbols) — define a Puck section once and
 * reference it from any page. Editing the component updates every page
 * that references it (edit-once, render-everywhere), like Webflow
 * Symbols or Figma components.
 *
 *   - `/admin/components` admin page (create, edit, publish, delete)
 *   - `Component` Puck block — drop it on a page and pick which
 *     component to show; holds only a reference, not a copy.
 *   - `{ type: "symbol" }` Puck field type (the component picker).
 *
 * Client-safe: no mongoose. The model, API routes, and the render-time
 * expansion hook live in ./server.js (wire via `serverPlugins`).
 */
export function symbolsPlugin(_options = {}) {
  return {
    name: "symbols",
    version: "1.10.0",

    blocks: { ...symbolBlock },

    fieldTypes: {
      symbol: SymbolPickerField,
    },

    categories: {
      components: {
        title: "Components",
        components: ["SymbolBlock"],
      },
    },

    adminPages: [
      {
        key: "components",
        label: "Components",
        icon: "AppstoreOutlined",
        path: "/admin/components",
        component: SymbolsAdminPage,
      },
    ],
  };
}
