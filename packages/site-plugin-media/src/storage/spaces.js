import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Build an S3 client pointed at DigitalOcean Spaces (or any
 * S3-compatible endpoint). Reads config from env by default but
 * accepts an override object for tests / self-hosted buckets.
 *
 * Required env:
 *   DO_SPACES_ENDPOINT  e.g. "https://fra1.digitaloceanspaces.com"
 *   DO_SPACES_REGION    e.g. "fra1"
 *   DO_SPACES_BUCKET    e.g. "my-site-media"
 *   DO_SPACES_KEY       access key id
 *   DO_SPACES_SECRET    secret access key
 *
 * Optional env:
 *   DO_SPACES_CDN_URL   CDN base (e.g. "https://cdn.example.com").
 *                       If unset, public URLs are built from the
 *                       endpoint + bucket.
 *   DO_SPACES_PREFIX    Key prefix (e.g. "uploads/"). Default "".
 */
export function readStorageConfig(overrides = {}) {
  const cfg = {
    endpoint: overrides.endpoint ?? process.env.DO_SPACES_ENDPOINT,
    region: overrides.region ?? process.env.DO_SPACES_REGION,
    bucket: overrides.bucket ?? process.env.DO_SPACES_BUCKET,
    accessKeyId: overrides.accessKeyId ?? process.env.DO_SPACES_KEY,
    secretAccessKey: overrides.secretAccessKey ?? process.env.DO_SPACES_SECRET,
    cdnUrl: overrides.cdnUrl ?? process.env.DO_SPACES_CDN_URL ?? "",
    prefix: overrides.prefix ?? process.env.DO_SPACES_PREFIX ?? "",
  };

  const missing = ["endpoint", "region", "bucket", "accessKeyId", "secretAccessKey"].filter(
    (k) => !cfg[k],
  );
  if (missing.length > 0) {
    throw new Error(
      `[premast/media] Missing storage config: ${missing.join(", ")}. ` +
        `Set DO_SPACES_* in your environment.`,
    );
  }
  return cfg;
}

let _clientCache = null;
let _clientCacheKey = null;
function getClient(cfg) {
  const key = `${cfg.endpoint}|${cfg.region}|${cfg.accessKeyId}`;
  if (_clientCache && _clientCacheKey === key) return _clientCache;
  _clientCache = new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: false,
  });
  _clientCacheKey = key;
  return _clientCache;
}

/** Strip leading/trailing slashes and normalise prefix. */
function joinKey(prefix, key) {
  const p = (prefix || "").replace(/^\/+|\/+$/g, "");
  const k = (key || "").replace(/^\/+/, "");
  return p ? `${p}/${k}` : k;
}

/**
 * Build the public URL for an object given storage config.
 * Prefers CDN_URL when set; falls back to the virtual-hosted endpoint.
 */
export function publicUrlFor(cfg, key) {
  if (cfg.cdnUrl) {
    const base = cfg.cdnUrl.replace(/\/+$/, "");
    return `${base}/${key}`;
  }
  const host = cfg.endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${cfg.bucket}.${host}/${key}`;
}

/**
 * Presign a direct PUT so the browser uploads straight to Spaces.
 * Returns the key (where the object will live), the URL to PUT to,
 * and the final public URL to store in MediaFile.
 */
export async function presignUpload({ filename, contentType, overrides }) {
  const cfg = readStorageConfig(overrides);
  const client = getClient(cfg);
  const safeName = sanitizeFilename(filename);
  const key = joinKey(cfg.prefix, `${Date.now()}-${randomId()}-${safeName}`);

  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: contentType || "application/octet-stream",
    ACL: "public-read",
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 5 });
  return {
    key,
    uploadUrl,
    publicUrl: publicUrlFor(cfg, key),
  };
}

export async function deleteObject({ key, overrides }) {
  const cfg = readStorageConfig(overrides);
  const client = getClient(cfg);
  await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}

function sanitizeFilename(name) {
  if (!name) return "file";
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "file";
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}
