import mongoose from "mongoose";

export async function listContentTypes(request, _params, { connectDB }) {
  await connectDB();
  const { ContentType } = (await import("../../db/models/ContentType.js"));
  const { searchParams } = new URL(request.url);
  const published = searchParams.get("published");
  const filter = {};
  if (published === "true") filter.published = true;
  if (published === "false") filter.published = false;
  const types = await ContentType.find(filter).sort({ updatedAt: -1 }).lean();
  return Response.json({ data: types });
}

export async function createContentType(request, _params, { connectDB }) {
  await connectDB();
  const { ContentType } = (await import("../../db/models/ContentType.js"));
  const body = await request.json();
  const { name, slug, urlPrefix, templateContent, description } = body;
  if (!name || !slug || !urlPrefix) {
    return Response.json({ error: "name, slug, and urlPrefix are required" }, { status: 400 });
  }
  try {
    const doc = await ContentType.create({
      name,
      slug,
      urlPrefix,
      templateContent: templateContent ?? "",
      description: description ?? "",
      published: Boolean(body.published),
    });
    return Response.json({ data: doc }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "name or slug already exists" }, { status: 409 });
    }
    throw err;
  }
}

export async function getContentType(_request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid content type id" }, { status: 400 });
  }
  await connectDB();
  const { ContentType } = (await import("../../db/models/ContentType.js"));
  const doc = await ContentType.findById(params.id).lean();
  if (!doc) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: doc });
}

export async function patchContentType(request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid content type id" }, { status: 400 });
  }
  await connectDB();
  const { ContentType } = (await import("../../db/models/ContentType.js"));
  const body = await request.json();
  const allowed = ["name", "slug", "urlPrefix", "templateContent", "description", "published"];
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
    const doc = await ContentType.findByIdAndUpdate(
      params.id, { $set: update }, { new: true, runValidators: true },
    ).lean();
    if (!doc) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ data: doc });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "name or slug already exists" }, { status: 409 });
    }
    throw err;
  }
}

export async function deleteContentType(_request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid content type id" }, { status: 400 });
  }
  await connectDB();
  const { ContentType } = (await import("../../db/models/ContentType.js"));
  const { ContentItem } = (await import("../../db/models/ContentItem.js"));
  const itemCount = await ContentItem.countDocuments({ contentType: params.id });
  if (itemCount > 0) {
    return Response.json(
      { error: `Cannot delete: ${itemCount} content item(s) still use this type` },
      { status: 409 },
    );
  }
  const deleted = await ContentType.findByIdAndDelete(params.id).lean();
  if (!deleted) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: deleted });
}
