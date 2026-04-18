import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { disconnect } from "./lib/mongo.js";
import { deleteAllUnderPrefix, hasSpacesCreds } from "./lib/spaces.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function globalTeardown() {
  await disconnect();

  // Drop the cached storage states so a next run starts from a clean
  // login. Cheap — the file is tiny and login is a few ms.
  await fs.rm(path.join(__dirname, ".auth"), { recursive: true, force: true });

  // Belt-and-braces cleanup for anything the media specs might have
  // left in the Spaces bucket (crash mid-test, broken DELETE, etc.).
  // Specs still delete their own files via the API; this catches
  // escapes. Scoped to this run's prefix so we can never touch
  // unrelated production objects.
  const prefix = process.env.E2E_SPACES_PREFIX;
  if (hasSpacesCreds() && prefix) {
    try {
      const { deleted } = await deleteAllUnderPrefix(prefix);
      if (deleted > 0) {
        console.log(`[globalTeardown] purged ${deleted} leftover object(s) under ${prefix}`);
      }
    } catch (err) {
      console.error("[globalTeardown] Spaces cleanup failed:", err.message);
    }
  }
}
