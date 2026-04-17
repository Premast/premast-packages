/**
 * Resolve a request path to a redirect target. Called from the
 * client site's `[...path]/page.jsx` catch-all before falling through
 * to `notFound()`.
 *
 * Returns { toPath, statusCode } or null if no redirect matches.
 *
 * Locale handling:
 *   - First try { fromPath, locale } match.
 *   - If no match and locale was provided, fall back to { fromPath,
 *     locale: null } — covers manually-created global redirects and
 *     legacy data created before the i18n plugin was installed.
 *
 * Side effect: increments `hits` and updates `lastHitAt` in a
 * fire-and-forget manner so the resolver stays fast. We do not await
 * the update.
 */
export async function resolveRedirect(path, locale, models) {
  if (!path || !models?.Redirect) return null;
  const Redirect = models.Redirect;

  let doc = null;
  if (locale) {
    doc = await Redirect.findOne({ fromPath: path, locale }).lean();
  }
  if (!doc) {
    doc = await Redirect.findOne({ fromPath: path, locale: null }).lean();
  }
  if (!doc) return null;

  // Fire-and-forget hit counter. Errors swallowed — we don't want a
  // metrics write to fail an otherwise-good redirect.
  Redirect.updateOne(
    { _id: doc._id },
    { $inc: { hits: 1 }, $set: { lastHitAt: new Date() } },
  ).catch(() => { /* noop */ });

  return { toPath: doc.toPath, statusCode: doc.statusCode || 301 };
}
