import mongoose from "mongoose";

export async function listPages(request, _params, { connectDB }) {
  await connectDB();
  const { Page } = (await import("../../db/models/Page.js"));
  const { searchParams } = new URL(request.url);
  const published = searchParams.get("published");
  const filter = {};
  if (published === "true") filter.published = true;
  if (published === "false") filter.published = false;
  const pages = await Page.find(filter).sort({ updatedAt: -1 }).lean();
  return Response.json({ data: pages });
}

export async function createPage(request, _params, { connectDB }) {
  await connectDB();
  const { Page } = (await import("../../db/models/Page.js"));
  const body = await request.json();
  const { title, slug, content, published } = body;
  if (!title || !slug) {
    return Response.json({ error: "title and slug are required" }, { status: 400 });
  }
  try {
    const page = await Page.create({
      title, slug, content: content ?? "", published: Boolean(published),
    });
    return Response.json({ data: page }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "slug already exists" }, { status: 409 });
    }
    throw err;
  }
}

export async function getPage(_request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid page id" }, { status: 400 });
  }
  await connectDB();
  const { Page } = (await import("../../db/models/Page.js"));
  const page = await Page.findById(params.id).lean();
  if (!page) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: page });
}

export async function patchPage(request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid page id" }, { status: 400 });
  }
  await connectDB();
  const { Page } = (await import("../../db/models/Page.js"));
  const body = await request.json();
  const allowed = ["title", "slug", "content", "published"];
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
    const page = await Page.findByIdAndUpdate(
      params.id, { $set: update }, { new: true, runValidators: true },
    ).lean();
    if (!page) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ data: page });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "slug already exists" }, { status: 409 });
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
