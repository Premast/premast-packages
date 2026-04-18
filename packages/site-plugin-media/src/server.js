import { requireAuth } from "@premast/site-core/auth";
import { mediaFileSchema } from "./models/MediaFile.js";
import {
  createHandler,
  deleteHandler,
  getHandler,
  listHandler,
  presignHandler,
} from "./handlers/media-handlers.js";

const BOTH = ["super_admin", "editor"];

/**
 * Server-only extensions for the media plugin. Merge into the plugin
 * object via `serverPlugins` in site.config.js:
 *
 *   serverPlugins: async () => {
 *     const { mediaPluginServer } = await import("@premast/site-plugin-media/server");
 *     return [{ name: "media", ...mediaPluginServer }];
 *   }
 */
export const mediaPluginServer = {
  apiRoutes: [
    { path: "media/presign", method: "POST", handler: requireAuth(presignHandler, { roles: BOTH }) },
    { path: "media", method: "POST", handler: requireAuth(createHandler, { roles: BOTH }) },
    { path: "media", method: "GET", handler: requireAuth(listHandler, { roles: BOTH }) },
    { path: "media/:id", method: "GET", handler: requireAuth(getHandler, { roles: BOTH }) },
    { path: "media/:id", method: "DELETE", handler: requireAuth(deleteHandler, { roles: BOTH }) },
  ],

  models: {
    MediaFile: mediaFileSchema,
  },
};
