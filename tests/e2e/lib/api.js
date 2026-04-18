/**
 * Thin wrapper around the running site's HTTP API. Specs use this
 * instead of writing to Mongo directly, so behaviour mirrors what a
 * real admin would trigger via the UI.
 */
import { ENV, requireEnv } from "./env.js";

function baseUrl() {
  return process.env[ENV.BASE_URL] || `http://127.0.0.1:${requireEnv(ENV.PORT)}`;
}

/**
 * Authenticated APIRequestContext helper — takes a Playwright
 * `request` fixture (already scoped to a user's storage state) and
 * returns typed JSON.
 */
export async function json(request, path, init = {}) {
  const res = await request.fetch(`${baseUrl()}${path}`, {
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status(), ok: res.ok(), body };
}

export function url(path) {
  return `${baseUrl()}${path}`;
}
