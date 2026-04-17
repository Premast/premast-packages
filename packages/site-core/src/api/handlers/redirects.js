import mongoose from "mongoose";

function normalizePath(path) {
  if (typeof path !== "string") return null;
  const trimmed = path.trim().toLowerCase();
  if (!trimmed.startsWith("/")) return null;
  return trimmed;
}

export async function listRedirects(request, _params, { connectDB, session }) {
  await connectDB();
  const { Redirect } = await import("../../db/models/Redirect.js");
  const { searchParams } = new URL(request.url);
  const filter = {};
  // Only authenticated admins should see the full list. Public callers
  // (the frontend resolver uses an internal helper, not this endpoint)
  // get nothing.
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const source = searchParams.get("source");
  if (source === "auto-slug-change" || source === "manual") {
    filter.source = source;
  }
  const locale = searchParams.get("locale");
  if (locale) filter.locale = locale;
  const toPath = searchParams.get("toPath");
  if (toPath) {
    const p = normalizePath(toPath);
    if (p) filter.toPath = p;
  }
  const fromPath = searchParams.get("fromPath");
  if (fromPath) {
    const p = normalizePath(fromPath);
    if (p) filter.fromPath = p;
  }

  const items = await Redirect.find(filter).sort({ updatedAt: -1 }).lean();

  // Lightweight stats payload for the admin view header.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, autoCount, hits7d, chains] = await Promise.all([
    Redirect.countDocuments({}),
    Redirect.countDocuments({ source: "auto-slug-change" }),
    Redirect.aggregate([
      { $match: { lastHitAt: { $gte: since } } },
      { $group: { _id: null, sum: { $sum: "$hits" } } },
    ]).then((r) => r[0]?.sum ?? 0),
    // Chain detection: a redirect is a chain link if its toPath is the
    // fromPath of another redirect.
    Redirect.aggregate([
      {
        $lookup: {
          from: "redirects",
          localField: "toPath",
          foreignField: "fromPath",
          as: "next",
        },
      },
      { $match: { "next.0": { $exists: true } } },
      { $count: "n" },
    ]).then((r) => r[0]?.n ?? 0),
  ]);

  return Response.json({
    data: items,
    stats: { total, autoCount, hits7d, chains },
  });
}

export async function createRedirect(request, _params, { connectDB }) {
  await connectDB();
  const { Redirect } = await import("../../db/models/Redirect.js");
  const body = await request.json();
  const fromPath = normalizePath(body.fromPath);
  const toPath = normalizePath(body.toPath);
  if (!fromPath || !toPath) {
    return Response.json(
      { error: "fromPath and toPath are required and must start with /" },
      { status: 400 },
    );
  }
  if (fromPath === toPath) {
    return Response.json(
      { error: "fromPath and toPath must differ" },
      { status: 400 },
    );
  }
  const statusCode = body.statusCode === 302 ? 302 : 301;
  const locale = body.locale || null;

  try {
    const doc = await Redirect.create({
      fromPath,
      toPath,
      statusCode,
      locale,
      source: "manual",
    });
    return Response.json({ data: doc }, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json(
        { error: "a redirect from this path already exists for this locale" },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function getRedirect(_request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid redirect id" }, { status: 400 });
  }
  await connectDB();
  const { Redirect } = await import("../../db/models/Redirect.js");
  const doc = await Redirect.findById(params.id).lean();
  if (!doc) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: doc });
}

export async function patchRedirect(request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid redirect id" }, { status: 400 });
  }
  await connectDB();
  const { Redirect } = await import("../../db/models/Redirect.js");
  const body = await request.json();
  const update = {};
  if ("fromPath" in body) {
    const p = normalizePath(body.fromPath);
    if (!p) return Response.json({ error: "invalid fromPath" }, { status: 400 });
    update.fromPath = p;
  }
  if ("toPath" in body) {
    const p = normalizePath(body.toPath);
    if (!p) return Response.json({ error: "invalid toPath" }, { status: 400 });
    update.toPath = p;
  }
  if ("statusCode" in body) {
    update.statusCode = body.statusCode === 302 ? 302 : 301;
  }
  if ("locale" in body) {
    update.locale = body.locale || null;
  }
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "no valid fields to update" }, { status: 400 });
  }

  try {
    const doc = await Redirect.findByIdAndUpdate(
      params.id,
      { $set: update },
      { returnDocument: "after", runValidators: true },
    ).lean();
    if (!doc) return Response.json({ error: "not found" }, { status: 404 });
    return Response.json({ data: doc });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json(
        { error: "a redirect from this path already exists for this locale" },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function deleteRedirect(_request, params, { connectDB }) {
  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "invalid redirect id" }, { status: 400 });
  }
  await connectDB();
  const { Redirect } = await import("../../db/models/Redirect.js");
  const deleted = await Redirect.findByIdAndDelete(params.id).lean();
  if (!deleted) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: deleted });
}
