export async function getSettings(_request, _params, { connectDB }) {
  await connectDB();
  const { SiteSettings } = await import("../../db/models/SiteSettings.js");
  const docs = await SiteSettings.find({}).lean();
  const settings = Object.fromEntries(docs.map((d) => [d.key, d.value]));
  return Response.json({ data: settings });
}

export async function getSetting(_request, params, { connectDB }) {
  await connectDB();
  const { SiteSettings } = await import("../../db/models/SiteSettings.js");
  const doc = await SiteSettings.findOne({ key: params.key }).lean();
  return Response.json({ data: doc ? doc.value : null });
}

export async function patchSettings(request, _params, { connectDB }) {
  await connectDB();
  const { SiteSettings } = await import("../../db/models/SiteSettings.js");
  const body = await request.json();

  if (!body || typeof body !== "object") {
    return Response.json({ error: "body must be an object of key-value pairs" }, { status: 400 });
  }

  const ops = Object.entries(body).map(([key, value]) => ({
    updateOne: {
      filter: { key },
      update: { $set: { key, value } },
      upsert: true,
    },
  }));

  await SiteSettings.bulkWrite(ops);

  const docs = await SiteSettings.find({}).lean();
  const settings = Object.fromEntries(docs.map((d) => [d.key, d.value]));
  return Response.json({ data: settings });
}
