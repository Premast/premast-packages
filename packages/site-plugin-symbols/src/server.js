import { requireAuth, optionalAuth } from "@premast/site-core/auth";
import { symbolSchema } from "./models/Symbol.js";
import { expandSymbols } from "./hooks/expand-symbols.js";
import {
  createSymbol,
  deleteSymbol,
  getSymbol,
  getSymbolUsage,
  listSymbols,
  patchSymbol,
} from "./handlers/symbol-handlers.js";

const BOTH = ["super_admin", "editor"];

/**
 * Server-only extensions for the symbols plugin. Merge into the plugin
 * object via `serverPlugins` in site.config.js:
 *
 *   serverPlugins: async () => {
 *     const { symbolsPluginServer } = await import("@premast/site-plugin-symbols/server");
 *     return [{ name: "symbols", ...symbolsPluginServer }];
 *   }
 *
 * The `beforePageRender` hook is what makes references live: it inlines
 * each referenced component's content into the page data before render.
 */
export const symbolsPluginServer = {
  apiRoutes: [
    // GET is optional-auth so the public front end can resolve published
    // components; writes require an editor.
    { path: "symbols", method: "GET", handler: optionalAuth(listSymbols) },
    { path: "symbols", method: "POST", handler: requireAuth(createSymbol, { roles: BOTH }) },
    { path: "symbols/:id", method: "GET", handler: optionalAuth(getSymbol) },
    { path: "symbols/:id/usage", method: "GET", handler: requireAuth(getSymbolUsage, { roles: BOTH }) },
    { path: "symbols/:id", method: "PATCH", handler: requireAuth(patchSymbol, { roles: BOTH }) },
    { path: "symbols/:id", method: "DELETE", handler: requireAuth(deleteSymbol, { roles: BOTH }) },
  ],

  models: {
    Symbol: symbolSchema,
  },

  hooks: {
    beforePageRender: expandSymbols,
  },
};
