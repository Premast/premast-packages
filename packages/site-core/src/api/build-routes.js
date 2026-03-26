import * as pageHandlers from "./handlers/pages.js";
import * as globalHandlers from "./handlers/globals.js";
import * as contentTypeHandlers from "./handlers/content-types.js";
import * as contentItemHandlers from "./handlers/content-items.js";

const CORE_ROUTES = {
  "GET /api/pages": pageHandlers.listPages,
  "POST /api/pages": pageHandlers.createPage,
  "GET /api/pages/:id": pageHandlers.getPage,
  "PATCH /api/pages/:id": pageHandlers.patchPage,
  "DELETE /api/pages/:id": pageHandlers.deletePage,
  "GET /api/globals": globalHandlers.listGlobals,
  "GET /api/globals/:key": globalHandlers.getGlobal,
  "PATCH /api/globals/:key": globalHandlers.patchGlobal,
  "GET /api/content-types": contentTypeHandlers.listContentTypes,
  "POST /api/content-types": contentTypeHandlers.createContentType,
  "GET /api/content-types/:id": contentTypeHandlers.getContentType,
  "PATCH /api/content-types/:id": contentTypeHandlers.patchContentType,
  "DELETE /api/content-types/:id": contentTypeHandlers.deleteContentType,
  "GET /api/content-items": contentItemHandlers.listContentItems,
  "POST /api/content-items": contentItemHandlers.createContentItem,
  "GET /api/content-items/:id": contentItemHandlers.getContentItem,
  "PATCH /api/content-items/:id": contentItemHandlers.patchContentItem,
  "DELETE /api/content-items/:id": contentItemHandlers.deleteContentItem,
};

export function buildApiRouteMap(plugins) {
  const routes = { ...CORE_ROUTES };
  for (const plugin of plugins) {
    if (!plugin.apiRoutes) continue;
    for (const route of plugin.apiRoutes) {
      const key = `${route.method.toUpperCase()} /api/${route.path}`;
      routes[key] = route.handler;
    }
  }
  return routes;
}
