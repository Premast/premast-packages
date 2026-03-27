import { signToken, verifyToken } from "./jwt.js";

const COOKIE_NAME = "__premast_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createSessionCookie(payload) {
  const token = await signToken(payload);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}${secure}`;
}

export async function getSessionFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;

  try {
    return await verifyToken(match[1]);
  } catch {
    return null;
  }
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}
