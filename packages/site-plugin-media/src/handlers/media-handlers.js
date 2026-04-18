import { presignUpload, deleteObject } from "../storage/spaces.js";

/**
 * POST /api/media/presign
 * Body: { filename, contentType }
 * Returns: { key, uploadUrl, publicUrl }
 *
 * Browser uploads directly to Spaces via the presigned URL, then
 * calls POST /api/media to record metadata.
 */
export async function presignHandler(request, _params, { session }) {
  const body = await safeJson(request);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });

  const { filename, contentType } = body;
  if (!filename || typeof filename !== "string") {
    return Response.json({ error: "filename is required" }, { status: 400 });
  }

  try {
    const result = await presignUpload({
      filename,
      contentType,
    });
    return Response.json({
      ...result,
      uploadedBy: session?.userId ?? null,
    });
  } catch (err) {
    return Response.json(
      { error: err.message || "Failed to presign upload" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/media
 * Body: { key, url, filename, mime, size, width?, height?, alt? }
 * Records a MediaFile row after a successful direct upload.
 */
export async function createHandler(request, _params, { connectDB, models, session }) {
  await connectDB();
  const MediaFile = models.MediaFile;
  if (!MediaFile) return Response.json({ error: "MediaFile model not registered" }, { status: 500 });

  const body = await safeJson(request);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  const { key, url, filename, mime, size, width, height, alt } = body;
  if (!key || !url) {
    return Response.json({ error: "key and url are required" }, { status: 400 });
  }

  const doc = await MediaFile.create({
    key,
    url,
    filename: filename || "",
    mime: mime || "",
    size: size ?? 0,
    width: width ?? null,
    height: height ?? null,
    alt: alt || "",
    uploadedBy: session?.userId ?? null,
  });
  return Response.json({ data: doc }, { status: 201 });
}

/**
 * GET /api/media
 * Query: ?limit=50&before=<ISO date>&q=<search>
 * Returns the most recent uploads, paginated with a cursor.
 */
export async function listHandler(request, _params, { connectDB, models }) {
  await connectDB();
  const MediaFile = models.MediaFile;
  if (!MediaFile) return Response.json({ error: "MediaFile model not registered" }, { status: 500 });

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
  const before = url.searchParams.get("before");
  const q = url.searchParams.get("q");

  const filter = {};
  if (before) {
    const d = new Date(before);
    if (!Number.isNaN(d.getTime())) filter.createdAt = { $lt: d };
  }
  if (q) filter.filename = { $regex: escapeRegex(q), $options: "i" };

  const items = await MediaFile.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const nextBefore = items.length === limit ? items[items.length - 1].createdAt : null;
  return Response.json({ data: items, nextBefore });
}

/** GET /api/media/:id */
export async function getHandler(_request, params, { connectDB, models }) {
  await connectDB();
  const MediaFile = models.MediaFile;
  if (!MediaFile) return Response.json({ error: "MediaFile model not registered" }, { status: 500 });

  const doc = await MediaFile.findById(params.id).lean();
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data: doc });
}

/** DELETE /api/media/:id — removes the Spaces object, then the DB row. */
export async function deleteHandler(_request, params, { connectDB, models }) {
  await connectDB();
  const MediaFile = models.MediaFile;
  if (!MediaFile) return Response.json({ error: "MediaFile model not registered" }, { status: 500 });

  const doc = await MediaFile.findById(params.id);
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    await deleteObject({ key: doc.key });
  } catch (err) {
    console.error("[premast/media] failed to delete remote object:", err);
  }
  await doc.deleteOne();
  return Response.json({ ok: true });
}

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
