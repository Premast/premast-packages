import { createAuthMiddleware } from "@premast/site-core/auth";

const authMiddleware = createAuthMiddleware({
  loginPath: "/admin/login",
});

export async function middleware(request) {
  const authResponse = await authMiddleware(request);
  if (authResponse) return authResponse;
}

export const config = {
  matcher: ["/admin/:path*"],
};
