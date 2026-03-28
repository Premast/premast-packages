import * as pageHandlers from "./handlers/pages.js";
import * as globalHandlers from "./handlers/globals.js";
import * as contentTypeHandlers from "./handlers/content-types.js";
import * as contentItemHandlers from "./handlers/content-items.js";
import * as authHandlers from "./handlers/auth.js";
import { requireAuth, optionalAuth } from "../auth/guard.js";

const BOTH = ["super_admin", "editor"];

const CORE_ROUTES = {
  // --- Auth (public) ---
  "POST /api/auth/login": authHandlers.login,
  "POST /api/auth/logout": authHandlers.logout,
  "GET /api/auth/me": authHandlers.me,
  "GET /api/auth/status": authHandlers.status,
  "POST /api/auth/setup": authHandlers.setup,

  // --- Auth (protected) ---
  "POST /api/auth/change-password": requireAuth(authHandlers.changePassword),
  "GET /api/auth/users": requireAuth(authHandlers.listUsers, { roles: ["super_admin"] }),
  "POST /api/auth/users": requireAuth(authHandlers.createUser, { roles: ["super_admin"] }),
  "PATCH /api/auth/users/:id": requireAuth(authHandlers.updateUser, { roles: ["super_admin"] }),
  "DELETE /api/auth/users/:id": requireAuth(authHandlers.deleteUser, { roles: ["super_admin"] }),

  // --- Pages ---
  "GET /api/pages": optionalAuth(pageHandlers.listPages),
  "POST /api/pages": requireAuth(pageHandlers.createPage, { roles: BOTH }),
  "GET /api/pages/:id": optionalAuth(pageHandlers.getPage),
  "PATCH /api/pages/:id": requireAuth(pageHandlers.patchPage, { roles: BOTH }),
  "DELETE /api/pages/:id": requireAuth(pageHandlers.deletePage, { roles: BOTH }),

  // --- Globals ---
  "GET /api/globals": optionalAuth(globalHandlers.listGlobals),
  "GET /api/globals/:key": optionalAuth(globalHandlers.getGlobal),
  "PATCH /api/globals/:key": requireAuth(globalHandlers.patchGlobal, { roles: BOTH }),

  // --- Content Types ---
  "GET /api/content-types": requireAuth(contentTypeHandlers.listContentTypes, { roles: BOTH }),
  "POST /api/content-types": requireAuth(contentTypeHandlers.createContentType, { roles: ["super_admin"] }),
  "GET /api/content-types/:id": requireAuth(contentTypeHandlers.getContentType, { roles: BOTH }),
  "PATCH /api/content-types/:id": requireAuth(contentTypeHandlers.patchContentType, { roles: ["super_admin"] }),
  "DELETE /api/content-types/:id": requireAuth(contentTypeHandlers.deleteContentType, { roles: ["super_admin"] }),

  // --- Content Items ---
  "GET /api/content-items": requireAuth(contentItemHandlers.listContentItems, { roles: BOTH }),
  "POST /api/content-items": requireAuth(contentItemHandlers.createContentItem, { roles: BOTH }),
  "GET /api/content-items/:id": requireAuth(contentItemHandlers.getContentItem, { roles: BOTH }),
  "PATCH /api/content-items/:id": requireAuth(contentItemHandlers.patchContentItem, { roles: BOTH }),
  "DELETE /api/content-items/:id": requireAuth(contentItemHandlers.deleteContentItem, { roles: BOTH }),
};

export function buildApiRouteMap(plugins) {
  const routes = { ...CORE_ROUTES };
  for (const plugin of plugins) {
    if (!plugin.apiRoutes) continue;
    for (const route of plugin.apiRoutes) {
      const key = `${route.method.toUpperCase()} /api/${route.path}`;
      if (routes[key]) {
        const source = key in CORE_ROUTES ? "core" : "another plugin";
        console.warn(
          `[premast] Plugin "${plugin.name}" registers route "${key}" which conflicts with ${source}. The plugin handler will take precedence.`,
        );
      }
      routes[key] = route.handler;
    }
  }
  return routes;
}
