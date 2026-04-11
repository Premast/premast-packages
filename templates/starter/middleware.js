import { NextResponse } from "next/server";
import { createAuthMiddleware } from "@premast/site-core/auth";

const authMiddleware = createAuthMiddleware({
  loginPath: "/admin/login",
});

// Matches things that look like an ISO locale code: "en", "ar", "pt-br".
// We can't query the DB from middleware (edge runtime), so we just
// pattern-match here and let the page component validate against the
// actual LocaleSetting collection.
const LOCALE_SHAPE = /^[a-z]{2}(-[a-z0-9]{2,8})?$/i;

// Anything in this set is definitely NOT a locale even if it matches
// the shape (e.g. "ui" if you ever add a /ui route).
const RESERVED_FIRST_SEGMENTS = new Set(["api", "admin", "_next", "favicon.ico"]);

export async function middleware(request) {
  // Auth gate for /admin runs first.
  const authResponse = await authMiddleware(request);
  if (authResponse) return authResponse;

  // Front-end locale prefix handling: /ar, /ar/about, /fr/blog/x …
  // Safe to leave in even if the i18n plugin isn't installed — it just
  // won't fire because there are no locale-prefixed URLs in single-locale
  // sites.
  const { pathname } = request.nextUrl;
  const firstSeg = pathname.split("/").filter(Boolean)[0];

  // Always strip any client-supplied x-premast-locale header before
  // forwarding the request — this header is meant to be set by the
  // middleware on locale-prefixed URLs. Without this strip, a malicious
  // client could spoof a locale and bypass URL-based detection.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-premast-locale");

  if (firstSeg && !RESERVED_FIRST_SEGMENTS.has(firstSeg) && LOCALE_SHAPE.test(firstSeg)) {
    // Set the trusted locale header so server components in the same
    // request can read the URL locale via next/headers.headers().
    requestHeaders.set("x-premast-locale", firstSeg.toLowerCase());

    const response = NextResponse.next({ request: { headers: requestHeaders } });

    // Persist as a cookie so subsequent navigations without an explicit
    // prefix (e.g. clicking a non-localized link) keep the same locale.
    response.cookies.set("premast_locale", firstSeg.toLowerCase(), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }

  // No URL locale prefix — forward with the cleaned headers so the
  // page/layout falls back to cookie or default locale.
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Front-end routes plus the existing admin matcher. We exclude
  // _next/* and api/* so the middleware doesn't run on every static
  // asset or API call.
  matcher: [
    "/admin/:path*",
    "/((?!api|_next|favicon.ico).*)",
  ],
};
