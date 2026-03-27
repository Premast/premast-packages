import { jwtVerify } from "jose";

export function createAuthMiddleware({ loginPath = "/admin/login", publicPaths = [] } = {}) {
  return async function premastAuthMiddleware(request) {
    const { pathname } = request.nextUrl;

    // Only protect /admin/* paths
    if (!pathname.startsWith("/admin")) return null;

    // Skip login and setup pages
    if (pathname === loginPath || pathname === "/admin/setup") return null;

    // Skip user-defined public paths
    if (publicPaths.some((p) => pathname.startsWith(p))) return null;

    const token = request.cookies.get("__premast_session")?.value;
    if (!token) {
      return redirectToLogin(request, loginPath);
    }

    try {
      const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
      await jwtVerify(token, secret);
      return null; // authenticated — proceed
    } catch {
      return redirectToLogin(request, loginPath);
    }
  };
}

function redirectToLogin(request, loginPath) {
  const url = request.nextUrl.clone();
  url.pathname = loginPath;
  url.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return Response.redirect(url);
}
