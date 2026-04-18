/**
 * Editor-only exports for the media plugin.
 *
 * Import this in puck.config.js (client-side only). Safe for the
 * browser bundle — no mongoose, no S3 SDK.
 *
 * Usage:
 *   import { mediaFieldTypes } from "@premast/site-plugin-media/editor";
 *   // pass into buildPuckConfig as the `fieldTypes` arg.
 */
export { MediaPickerField } from "./fields/MediaPickerField.jsx";
export { uploadMediaFile } from "./client/upload.js";

import { MediaPickerField } from "./fields/MediaPickerField.jsx";

export const mediaFieldTypes = {
  media: MediaPickerField,
};
