import mongoose from "mongoose";
import { getSymbolModel } from "../models/Symbol.js";

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listSymbols(request, _params, { connectDB, session }) {
  await connectDB();
  const Symbol = getSymbolModel();
  const { searchParams } = new URL(request.url);
  const published = searchParams.get("published");
  const locale = searchParams.get("locale");
  const filter = {};
  if (!session) {
    filter.published = true;
  } else {
    if (published === "true") filter.published = true;
    if (published === "false") filter.published = false;
  }
  if (locale) filter.locale = locale;
  const symbols = await Symbol.find(filter).sort({ updatedAt: -1 }).lean();
  return Response.json({ data: symbols });
}

export async function createSymbol(request, _params, { connectDB }) {
  await connectDB();
  const Symbol = getSymbolModel();
  const body = await request.json();
  const { name, content, published, locale, translationGroupId } = body;
  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  const slug = body.slug ? slugify(body.slug) : slugify(name);
  if (!slug) {
    return Response.json({ error: "name must contain at least one alphanumeric character" }, { status: 400 });
  }
  try {
    const doc = await Symbol.create({
      name,
      slug,
      content: content ?? "",
      published: Boolean(published),
      ...(locale !== undefined ? { locale } : {}),
      ...(translationGroupId !== undefined ? { translationGroupId } : {}),
    });
    return Response.json({ data: doc }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "a component with this slug already exists for this locale" }, { status: 409 });
    }
    throw err;
  }
}

export async function getSymbol(_request, params, { connectDB, session }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid component id" }, { status: 400 });
  }
  await connectDB();
  const Symbol = getSymbolModel();
  const filter = { _id: params.id };
  if (!session) filter.published = true;
  const doc = await Symbol.findOne(filter).lean();
  if (!doc) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: doc });
}

export async function patchSymbol(request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid component id" }, { status: 400 });
  }
  await connectDB();
  const Symbol = getSymbolModel();
  const body = await request.json();
  const allowed = ["name", "slug", "content", "published", "locale", "translationGroupId"];
  const update = {};
  for (const key of allowed) {
    if (!(key in body)) continue;
    if (key === "slug" && typeof body.slug === "string") {
      update.slug = slugify(body.slug);
    } else if (key === "published") {
      update.published = Boolean(body.published);
    } else {
      update[key] = body[key];
    }
  }
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "no valid fields to update" }, { status: 400 });
  }
  try {
    const doc = await Symbol.findByIdAndUpdate(
      params.id,
      { $set: update },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!doc) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ data: doc });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "a component with this slug already exists for this locale" }, { status: 409 });
    }
    throw err;
  }
}

/**
 * Count how many documents reference this component.
 *
 * Page/ContentItem/Global all store Puck data as a JSON *string*, so a
 * substring match on the id is both accurate (ObjectId hex is unique)
 * and cheap enough. It catches the generic `SymbolBlock`
 * (`"symbolId":"<id>"`) and the generated `SymbolRef_<id>` type alike.
 */
export async function getSymbolUsage(_request, params, { connectDB, models }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid component id" }, { status: 400 });
  }
  await connectDB();
  // Id is hex-only, so this is safe to embed in a regex.
  const escaped = String(params.id).replace(/[^a-fA-F0-9]/g, "");
  const filter = { content: { $regex: escaped } };

  const counts = {};
  for (const name of ["Page", "ContentItem", "Global"]) {
    const Model = models?.[name];
    if (!Model) continue;
    try {
      counts[name] = await Model.countDocuments(filter);
    } catch {
      counts[name] = 0;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Response.json({ data: { total, counts } });
}

export async function deleteSymbol(_request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid component id" }, { status: 400 });
  }
  await connectDB();
  const Symbol = getSymbolModel();
  const deleted = await Symbol.findByIdAndDelete(params.id).lean();
  if (!deleted) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: deleted });
}
