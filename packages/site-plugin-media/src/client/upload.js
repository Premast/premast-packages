"use client";

/**
 * Two-step upload: get a presigned PUT URL, upload bytes directly to
 * Spaces, then record metadata in the CMS database.
 *
 * Returns the saved MediaFile document (including `_id` and `url`).
 */
export async function uploadMediaFile(file, { onProgress } = {}) {
  const presignRes = await fetch("/api/media/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });
  const presign = await presignRes.json();
  if (!presignRes.ok) throw new Error(presign.error || "Presign failed");

  await putWithProgress(presign.uploadUrl, file, onProgress);

  const dims = await readImageDimensions(file).catch(() => ({}));

  const recordRes = await fetch("/api/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: presign.key,
      url: presign.publicUrl,
      filename: file.name,
      mime: file.type,
      size: file.size,
      width: dims.width ?? null,
      height: dims.height ?? null,
    }),
  });
  const record = await recordRes.json();
  if (!recordRes.ok) throw new Error(record.error || "Record failed");
  return record.data;
}

function putWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(file);
  });
}

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    if (!file.type?.startsWith("image/")) return resolve({});
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
