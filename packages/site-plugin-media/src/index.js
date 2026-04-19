import { MediaPickerField } from "./fields/MediaPickerField.jsx";
import { MediaAdminPage } from "./admin/MediaAdminPage.jsx";

/**
 * @premast/site-plugin-media
 *
 * Adds a media library to the CMS:
 *   - `/admin/media` admin page (upload, browse, delete)
 *   - `{ type: "media" }` Puck field type, drop-in replacement for
 *     plain URL text inputs. Stores the public URL string — same
 *     value shape as `{ type: "text" }`, so switching a field over
 *     doesn't break existing published pages.
 *
 * Storage is S3-compatible (defaults to DigitalOcean Spaces). See
 * ./storage/spaces.js for the required DO_SPACES_* env vars.
 */
export function mediaPlugin(_options = {}) {
  return {
    name: "media",
    version: "1.8.1",

    fieldTypes: {
      media: MediaPickerField,
    },

    adminPages: [
      {
        key: "media",
        label: "Media",
        icon: "PictureOutlined",
        path: "/admin/media",
        component: MediaAdminPage,
      },
    ],
  };
}
