export async function matchRoute(siteConfig, method, request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const routeMap = await siteConfig.getApiRouteHandlers();

  for (const [pattern, handler] of Object.entries(routeMap)) {
    const [routeMethod, routePath] = pattern.split(" ");
    if (routeMethod !== method) continue;
    const params = matchPath(routePath, pathname);
    if (params !== null) {
      try {
        const connectDB = await siteConfig.getConnectDB();
        const models = await siteConfig.getModels();
        return await handler(request, params, {
          connectDB,
          models,
          hooks: siteConfig.hooks,
        });
      } catch (err) {
        console.error(`[premast] ${pattern}:`, err);
        return Response.json(
          { error: err.message ?? "Internal server error" },
          { status: 500 },
        );
      }
    }
  }
  return Response.json({ error: "Not found" }, { status: 404 });
}

function matchPath(pattern, pathname) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}
