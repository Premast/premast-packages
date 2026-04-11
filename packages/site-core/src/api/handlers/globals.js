import { runBeforeGlobalSave } from "../../config.js";

export async function listGlobals(request, _params, { connectDB, session }) {
  await connectDB();
  const { Global } = (await import("../../db/models/Global.js"));
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
  const globals = await Global.find(filter).sort({ key: 1, locale: 1 }).lean();
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
  // Optional ?locale= filter on get. Without it, returns the legacy
  // (locale: null) record if present, falling back to anything stored
  // under that key. Lets old single-locale code keep working.
  const url = new URL(_request.url);
  const locale = url.searchParams.get("locale");
  const filter = { key: params.key };
  if (locale) filter.locale = locale;
  if (!session) filter.published = true;
  const doc = await Global.findOne(filter).lean();
  if (!doc) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ data: doc });
}

export async function patchGlobal(request, params, { connectDB, hooks }) {
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
  if ("locale" in body) update.locale = body.locale;
  if ("translationGroupId" in body) update.translationGroupId = body.translationGroupId;
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "no valid fields to update" }, { status: 400 });
  }

  // Allow plugin hooks to enrich (e.g. fill locale on first save).
  const enriched = await runBeforeGlobalSave(hooks, update, "update", params.key);

  // We must include `locale` in the lookup so we patch the correct
  // sibling. If the request didn't specify, default to legacy
  // (locale: null) record.
  const targetLocale = body.locale ?? null;
  try {
    const doc = await Global.findOneAndUpdate(
      { key: params.key, locale: targetLocale },
      { $set: enriched },
      { returnDocument: "after", runValidators: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    if (!doc) return Response.json({ error: "not found" }, { status: 404 });
    if (hooks?.afterGlobalSave) {
      for (const { fn } of hooks.afterGlobalSave) {
        try { await fn({ global: doc, action: "update" }); } catch (e) {
          console.error("[premast] afterGlobalSave hook error:", e);
        }
      }
    }
    return Response.json({ data: doc });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "global already exists for this locale" }, { status: 409 });
    }
    throw err;
  }
}
