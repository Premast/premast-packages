import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";
const EXPIRY = "7d";

function getSecret() {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error("AUTH_SECRET env var must be at least 32 characters");
  }
  return new TextEncoder().encode(raw);
}

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload;
}
