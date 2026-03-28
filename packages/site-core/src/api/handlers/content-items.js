import mongoose from "mongoose";

export async function listContentItems(request, _params, { connectDB }) {
  await connectDB();
  const { ContentItem } = (await import("../../db/models/ContentItem.js"));
  const { searchParams } = new URL(request.url);
  const filter = {};

  const contentType = searchParams.get("contentType");
  if (contentType && mongoose.isValidObjectId(contentType)) {
    filter.contentType = contentType;
  }

  const published = searchParams.get("published");
  if (published === "true") filter.published = true;
  if (published === "false") filter.published = false;

  const items = await ContentItem.find(filter)
    .sort({ updatedAt: -1 })
    .populate("contentType", "name slug urlPrefix")
    .lean();

  return Response.json({ data: items });
}

export async function createContentItem(request, _params, { connectDB }) {
  await connectDB();
  const { ContentItem } = (await import("../../db/models/ContentItem.js"));
  const body = await request.json();
  const { title, slug, contentType, content, metadata } = body;

  if (!title || !slug || !contentType) {
    return Response.json({ error: "title, slug, and contentType are required" }, { status: 400 });
  }

  if (!mongoose.isValidObjectId(contentType)) {
    return Response.json({ error: "invalid contentType id" }, { status: 400 });
  }

  try {
    const doc = await ContentItem.create({
      title,
      slug,
      contentType,
      content: content ?? "",
      metadata: metadata ?? {},
      published: Boolean(body.published),
    });
    return Response.json({ data: doc }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "slug already exists for this content type" }, { status: 409 });
    }
    throw err;
  }
}

export async function getContentItem(_request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid content item id" }, { status: 400 });
  }
  await connectDB();
  const { ContentItem } = (await import("../../db/models/ContentItem.js"));
  const doc = await ContentItem.findById(params.id)
    .populate("contentType", "name slug urlPrefix")
    .lean();
  if (!doc) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: doc });
}

export async function patchContentItem(request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid content item id" }, { status: 400 });
  }
  await connectDB();
  const { ContentItem } = (await import("../../db/models/ContentItem.js"));
  const body = await request.json();
  const allowed = ["title", "slug", "content", "metadata", "published"];
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
    const doc = await ContentItem.findByIdAndUpdate(
      params.id, { $set: update }, { returnDocument: "after", runValidators: true },
    ).lean();
    if (!doc) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ data: doc });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "slug already exists for this content type" }, { status: 409 });
    }
    throw err;
  }
}

export async function deleteContentItem(_request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid content item id" }, { status: 400 });
  }
  await connectDB();
  const { ContentItem } = (await import("../../db/models/ContentItem.js"));
  const deleted = await ContentItem.findByIdAndDelete(params.id).lean();
  if (!deleted) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: deleted });
}
