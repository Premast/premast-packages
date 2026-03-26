import mongoose from "mongoose";
import { Page } from "./models/Page.js";
import { Global } from "./models/Global.js";
import { ContentType } from "./models/ContentType.js";
import { ContentItem } from "./models/ContentItem.js";

export function registerModels(plugins) {
  const models = { Page, Global, ContentType, ContentItem };
  for (const plugin of plugins) {
    if (!plugin.models) continue;
    for (const [name, schema] of Object.entries(plugin.models)) {
      models[name] = mongoose.models[name] ?? mongoose.model(name, schema);
    }
  }
  return models;
}
