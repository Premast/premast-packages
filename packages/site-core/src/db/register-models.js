import mongoose from "mongoose";
import { Page } from "./models/Page.js";
import { Global } from "./models/Global.js";
import { ContentType } from "./models/ContentType.js";
import { ContentItem } from "./models/ContentItem.js";
import { User } from "./models/User.js";
import { SiteSettings } from "./models/SiteSettings.js";
import { Redirect } from "./models/Redirect.js";

export async function registerModels(plugins) {
  const models = { Page, Global, ContentType, ContentItem, User, SiteSettings, Redirect };
  for (const plugin of plugins) {
    let pluginModels = null;
    if (typeof plugin.loadModels === "function") {
      pluginModels = await plugin.loadModels();
    } else if (plugin.models) {
      pluginModels = plugin.models;
    }
    if (!pluginModels) continue;
    for (const [name, schema] of Object.entries(pluginModels)) {
      models[name] = mongoose.models[name] ?? mongoose.model(name, schema);
    }
  }
  return models;
}
