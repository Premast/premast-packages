import { expect } from "@playwright/test";
import { test } from "../../fixtures/db.js";

/**
 * Media plugin — covers the full surface:
 *   - route mounting / auth gating
 *   - DB-only CRUD via POST/GET/DELETE /api/media
 *   - the presign → PUT-to-Spaces → record → verify → delete round-trip
 *     against a REAL bucket when DO_SPACES_* are configured
 *
 * Real-bucket tests auto-skip when creds aren't set, so the suite is
 * green for contributors without credentials. See tests/e2e/.env.test
 * for the expected variable names.
 */

const HAS_SPACES =
  !!process.env.DO_SPACES_KEY &&
  !!process.env.DO_SPACES_SECRET &&
  !!process.env.DO_SPACES_ENDPOINT &&
  !!process.env.DO_SPACES_BUCKET;

// 1x1 transparent PNG — smallest valid payload the handler can accept.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

test.describe("media plugin — routing & auth", () => {
  test("/admin/media loads for super_admin", async ({ adminPage }) => {
    const res = await adminPage.goto("/admin/media");
    expect(res.status()).toBeLessThan(400);
    expect(adminPage.url()).not.toContain("/admin/login");
    await expect(adminPage.getByText("Media", { exact: true }).first()).toBeVisible();
  });

  test("/api/media requires auth (anon=401, admin=not-404)", async ({ request, adminRequest }) => {
    const anon = await request.get("/api/media");
    expect(anon.status()).toBe(401);
    const auth = await adminRequest.get("/api/media");
    expect(auth.status(), "GET /api/media should be mounted").not.toBe(404);
  });

  test("/api/media/presign rejects anon and is mounted for admin", async ({ request, adminRequest }) => {
    const anon = await request.post("/api/media/presign", {
      data: { filename: "x.png", contentType: "image/png" },
    });
    expect(anon.status()).toBe(401);
    const auth = await adminRequest.post("/api/media/presign", {
      data: { filename: "x.png", contentType: "image/png" },
    });
    expect(auth.status(), "POST /api/media/presign should be mounted").not.toBe(404);
  });
});

test.describe("media plugin — DB records", () => {
  test("POST /api/media records metadata and GET lists it", async ({ adminRequest }) => {
    const key = `tests/e2e/${Date.now()}-sample.png`;
    const url = `https://example.test/${key}`;
    const created = await adminRequest.post("/api/media", {
      data: {
        key,
        url,
        filename: "sample.png",
        mime: "image/png",
        size: 1234,
        width: 100,
        height: 100,
      },
    });
    expect(created.status()).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.data).toMatchObject({ key, url, filename: "sample.png" });

    const listed = await adminRequest.get("/api/media");
    expect(listed.ok()).toBeTruthy();
    const listBody = await listed.json();
    const match = listBody.data.find((m) => m.key === key);
    expect(match, "newly-created media record should appear in the list").toBeTruthy();
    expect(match.url).toBe(url);
  });

  test("POST /api/media rejects missing key/url", async ({ adminRequest }) => {
    const res = await adminRequest.post("/api/media", {
      data: { filename: "no-key.png" },
    });
    expect(res.status()).toBe(400);
  });

  test("DELETE /api/media/:id removes the DB row even if Spaces fails", async ({ adminRequest }) => {
    const created = await adminRequest.post("/api/media", {
      data: {
        key: `tests/e2e/${Date.now()}-delete-me.png`,
        url: "https://example.test/delete-me.png",
        filename: "delete-me.png",
        mime: "image/png",
        size: 10,
      },
    });
    expect(created.status()).toBe(201);
    const { data } = await created.json();

    const del = await adminRequest.delete(`/api/media/${data._id}`);
    expect(del.ok()).toBeTruthy();
    expect((await del.json()).ok).toBe(true);

    const gone = await adminRequest.get(`/api/media/${data._id}`);
    expect(gone.status()).toBe(404);
  });

  test("admin Media page renders uploaded items in the grid", async ({
    adminPage,
    adminRequest,
  }) => {
    const filename = `visible-${Date.now()}.png`;
    await adminRequest.post("/api/media", {
      data: {
        key: `tests/e2e/${filename}`,
        url: `https://example.test/${filename}`,
        filename,
        mime: "image/png",
        size: 512,
      },
    });

    await adminPage.goto("/admin/media");
    await expect(adminPage.getByText(filename)).toBeVisible();
  });
});

test.describe("media plugin — real Spaces round-trip", () => {
  test.skip(!HAS_SPACES, "DO_SPACES_* not configured — skipping live-bucket tests");

  test("presign → PUT to Spaces → public URL serves → record → delete", async ({ adminRequest }) => {
    const filename = `roundtrip-${Date.now()}.png`;
    const contentType = "image/png";

    // 1) Get a presigned PUT URL from the plugin.
    const presign = await adminRequest.post("/api/media/presign", {
      data: { filename, contentType },
    });
    expect(presign.ok(), `presign failed: ${await presign.text()}`).toBeTruthy();
    const { key, uploadUrl, publicUrl } = await presign.json();
    expect(uploadUrl).toMatch(/^https?:\/\//);
    expect(publicUrl).toMatch(/^https?:\/\//);
    // Confirm our run-scoped prefix is honored — if this fails, the
    // runner isn't forwarding DO_SPACES_PREFIX correctly and we'd be
    // uploading to the bucket root.
    expect(key, "upload key must be under the run-scoped prefix").toMatch(/^e2e-harness\//);

    // 2) Upload the bytes directly to Spaces via the presigned URL.
    //    The presign handler signs ACL=public-read into the URL, so
    //    the client MUST re-send the x-amz-acl header or the ACL
    //    silently falls back to private and the public GET returns
    //    403. This mirrors what the media plugin's browser uploader
    //    does.
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "x-amz-acl": "public-read",
      },
      body: TINY_PNG,
    });
    expect(put.ok, `PUT to Spaces failed: ${put.status} ${await put.text().catch(() => "")}`).toBeTruthy();

    // 3) The public URL should now serve the object. ACL is
    //    public-read from the presign handler.
    const fetched = await fetch(publicUrl);
    expect(fetched.ok, `public URL should serve the uploaded object: ${fetched.status}`).toBeTruthy();
    const bytes = Buffer.from(await fetched.arrayBuffer());
    expect(bytes.equals(TINY_PNG)).toBe(true);

    // 4) Record the metadata row — this is what admin UIs read from.
    const created = await adminRequest.post("/api/media", {
      data: {
        key,
        url: publicUrl,
        filename,
        mime: contentType,
        size: TINY_PNG.length,
        width: 1,
        height: 1,
      },
    });
    expect(created.status()).toBe(201);
    const { data } = await created.json();

    // 5) Delete both the Spaces object and the DB row via the API.
    const del = await adminRequest.delete(`/api/media/${data._id}`);
    expect(del.ok()).toBeTruthy();

    // 6) The DB row is gone.
    const gone = await adminRequest.get(`/api/media/${data._id}`);
    expect(gone.status()).toBe(404);

    // 7) The object is gone from Spaces. Public GET should 403/404.
    //    Allow either because Spaces sometimes returns 403 for
    //    missing-object-in-public-bucket.
    const after = await fetch(publicUrl);
    expect(after.ok).toBe(false);
    expect([403, 404]).toContain(after.status);
  });

  test("presign rejects missing filename with 400", async ({ adminRequest }) => {
    const res = await adminRequest.post("/api/media/presign", {
      data: { contentType: "image/png" },
    });
    expect(res.status()).toBe(400);
  });
});
