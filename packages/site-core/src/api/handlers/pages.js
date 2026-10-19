import mongoose from "mongoose";
import * as contentSave from "../../services/content-save.js";

export async function listPages(request, _params, { connectDB, session }) {
  await connectDB();
  const { Page } = (await import("../../db/models/Page.js"));
  const { searchParams } = new URL(request.url);
  const published = searchParams.get("published");
  const locale = searchParams.get("locale");
  const filter = {};
  if (!session) {
    // Unauthenticated: only published content
    filter.published = true;
  } else {
    if (published === "true") filter.published = true;
    if (published === "false") filter.published = false;
  }
  if (locale) filter.locale = locale;
  const pages = await Page.find(filter).sort({ updatedAt: -1 }).lean();
  return Response.json({ data: pages });
}

export async function createPage(request, _params, { connectDB, hooks }) {
  await connectDB();
  const body = await request.json();
  const { title, slug, content, published, locale, translationGroupId } = body;
  if (!title || !slug) {
    return Response.json({ error: "title and slug are required" }, { status: 400 });
  }
  try {
    // Build the initial doc; the save path runs beforePageSave hooks
    // (e.g. i18n) on it, then afterPageSave hooks.
    const initial = {
      title,
      slug,
      content: content ?? "",
      published: Boolean(published),
      ...(locale !== undefined ? { locale } : {}),
      ...(translationGroupId !== undefined ? { translationGroupId } : {}),
    };
    const page = await contentSave.createPage(initial, { hooks });
    return Response.json({ data: page }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "slug already exists for this locale" }, { status: 409 });
    }
    throw err;
  }
}

export async function getPage(_request, params, { connectDB, session }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid page id" }, { status: 400 });
  }
  await connectDB();
  const { Page } = (await import("../../db/models/Page.js"));
  const filter = { _id: params.id };
  if (!session) filter.published = true;
  const page = await Page.findOne(filter).lean();
  if (!page) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: page });
}

export async function patchPage(request, params, { connectDB, hooks, models }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid page id" }, { status: 400 });
  }
  await connectDB();
  const body = await request.json();
  const allowed = ["title", "slug", "content", "published", "locale", "translationGroupId"];
  const update = {};
  for (const key of allowed) {
    if (key in body) {
      if (key === "slug" && typeof body.slug === "string") {
        update.slug = body.slug.trim().toLowerCase();
      } else if (key === "published") {
        update.published = Boolean(body.published);
      } else {
        update[key] = body[key];
      }
    }
  }
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "no valid fields to update" }, { status: 400 });
  }

  try {
    const page = await contentSave.updatePage(params.id, update, { hooks, models });
    if (!page) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ data: page });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "slug already exists for this locale" }, { status: 409 });
    }
    throw err;
  }
}

export async function deletePage(_request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid page id" }, { status: 400 });
  }
  await connectDB();
  const { Page } = (await import("../../db/models/Page.js"));
  const deleted = await Page.findByIdAndDelete(params.id).lean();
  if (!deleted) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: deleted });
}
