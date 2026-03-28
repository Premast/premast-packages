export async function listGlobals(request, _params, { connectDB, session }) {
  await connectDB();
  const { Global } = (await import("../../db/models/Global.js"));
  const { searchParams } = new URL(request.url);
  const published = searchParams.get("published");
  const filter = {};
  if (!session) {
    filter.published = true;
  } else {
    if (published === "true") filter.published = true;
    if (published === "false") filter.published = false;
  }
  const globals = await Global.find(filter).sort({ key: 1 }).lean();
  return Response.json({ data: globals });
}

export async function getGlobal(_request, params, { connectDB, session }) {
  const { VALID_KEYS, Global } = (await import("../../db/models/Global.js"));
  if (!VALID_KEYS.includes(params.key)) {
    return Response.json(
      { error: `invalid key — must be one of: ${VALID_KEYS.join(", ")}` },
      { status: 400 },
    );
  }
  await connectDB();
  const filter = { key: params.key };
  if (!session) filter.published = true;
  const doc = await Global.findOne(filter).lean();
  if (!doc) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: doc });
}

export async function patchGlobal(request, params, { connectDB }) {
  const { VALID_KEYS, Global } = (await import("../../db/models/Global.js"));
  if (!VALID_KEYS.includes(params.key)) {
    return Response.json(
      { error: `invalid key — must be one of: ${VALID_KEYS.join(", ")}` },
      { status: 400 },
    );
  }
  await connectDB();
  const body = await request.json();
  const update = {};
  if ("content" in body) update.content = body.content;
  if ("published" in body) update.published = Boolean(body.published);
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "no valid fields to update" }, { status: 400 });
  }
  const doc = await Global.findOneAndUpdate(
    { key: params.key }, { $set: update }, { returnDocument: "after", runValidators: true },
  ).lean();
  if (!doc) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: doc });
}
