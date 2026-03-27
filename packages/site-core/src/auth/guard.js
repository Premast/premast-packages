import { getSessionFromRequest } from "./session.js";

export function requireAuth(handler, { roles } = {}) {
  return async (request, params, context) => {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (roles && !roles.includes(session.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(request, params, { ...context, session });
  };
}

export function optionalAuth(handler) {
  return async (request, params, context) => {
    const session = await getSessionFromRequest(request);
    return handler(request, params, { ...context, session: session || null });
  };
}
