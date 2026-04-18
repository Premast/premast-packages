/**
 * Minimal S3 client helpers for the E2E suite. Scoped to operations
 * the harness needs (list + bulk-delete); anything richer should go
 * through the media plugin's HTTP API instead, which is the contract
 * tests are actually verifying.
 *
 * Why duplicate a tiny client here instead of importing from
 * @premast/site-plugin-media/server? Because the plugin doesn't
 * re-export its internal spaces module, and deep imports through
 * "/src/..." aren't part of its public API contract.
 */
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

export function hasSpacesCreds() {
  return Boolean(
    process.env.DO_SPACES_KEY &&
      process.env.DO_SPACES_SECRET &&
      process.env.DO_SPACES_ENDPOINT &&
      process.env.DO_SPACES_BUCKET,
  );
}

function client() {
  return new S3Client({
    endpoint: process.env.DO_SPACES_ENDPOINT,
    region: process.env.DO_SPACES_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY,
      secretAccessKey: process.env.DO_SPACES_SECRET,
    },
    forcePathStyle: false,
  });
}

/**
 * Delete every object under `prefix` from the configured bucket.
 * Safe-by-default: refuses any prefix that doesn't start with
 * "e2e-harness/" so a misconfigured teardown can't wipe production
 * files.
 */
export async function deleteAllUnderPrefix(prefix) {
  if (!hasSpacesCreds()) return { deleted: 0, skipped: "no-creds" };
  if (!prefix || !prefix.startsWith("e2e-harness/")) {
    throw new Error(
      `[spaces] refusing to delete prefix ${JSON.stringify(prefix)} — ` +
        `must start with "e2e-harness/" to prevent production wipeouts`,
    );
  }

  const s3 = client();
  const bucket = process.env.DO_SPACES_BUCKET;
  let total = 0;
  let ContinuationToken;

  do {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken,
      }),
    );
    const keys = (list.Contents || []).map((o) => ({ Key: o.Key }));
    if (keys.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys, Quiet: true },
        }),
      );
      total += keys.length;
    }
    ContinuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (ContinuationToken);

  return { deleted: total };
}
