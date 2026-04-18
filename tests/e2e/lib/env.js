/**
 * Shared env contract between the runner (scripts/run-e2e.js),
 * Playwright globalSetup, and the spec fixtures. Keeping the names in
 * one place lets us swap transports (memory-server → docker Mongo)
 * without chasing string literals through the harness.
 */
export const ENV = {
  PORT: "E2E_PORT",
  BASE_URL: "E2E_BASE_URL",
  MONGODB_URI: "MONGODB_URI",
  MONGODB_DB_NAME: "MONGODB_DB_NAME",
  AUTH_SECRET: "AUTH_SECRET",
};

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`[tests/e2e] missing env var ${name}`);
  return v;
}
