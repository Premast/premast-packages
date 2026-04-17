"use client";

import {
  CheckOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Radio,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";

const { Text } = Typography;

/**
 * Normalize free text into a URL-safe slug.
 * Mirrors the toSlug helper used in AdminPagesView.jsx so behavior is
 * consistent between the create modal and the editor.
 */
function toSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Reusable "Page identity" panel. Renders Page Title + URL Slug
 * inputs with auto-create-redirect UX. Used by both AdminPageEditor
 * (Page) and AdminContentEditor (ContentItem). The caller passes
 * `endpoint` ("/api/pages/:id" or "/api/content-items/:id") and
 * `pathPrefix` (always "" for Pages, the ContentType.urlPrefix for
 * ContentItems) so the displayed redirect path matches what the
 * backend will create.
 */
export function PageMetaPanel({
  endpoint,
  initialTitle,
  initialSlug,
  pathPrefix = "",
  onSaved,
}) {
  const [title, setTitle] = useState(initialTitle || "");
  const [slug, setSlug] = useState(initialSlug || "");
  const [savedTitle, setSavedTitle] = useState(initialTitle || "");
  const [savedSlug, setSavedSlug] = useState(initialSlug || "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [redirects, setRedirects] = useState([]);
  const [showSlugModal, setShowSlugModal] = useState(false);
  const [pendingStatusCode, setPendingStatusCode] = useState(301);

  // Fetch existing redirects pointing AT this page so editors can see
  // them inline. We query by toPath = current saved path because
  // that's what auto-redirects target.
  useEffect(() => {
    let active = true;
    async function load() {
      if (!savedSlug) return;
      const target = `${pathPrefix}/${savedSlug}`;
      try {
        const res = await fetch(`/api/redirects?toPath=${encodeURIComponent(target)}`);
        const json = await res.json();
        if (active && res.ok) {
          setRedirects(json.data ?? []);
        }
      } catch { /* silent */ }
    }
    load();
    return () => { active = false; };
  }, [savedSlug, pathPrefix]);

  const titleChanged = title !== savedTitle;
  const slugChanged = slug !== savedSlug;
  const dirty = titleChanged || slugChanged;

  const oldPath = useMemo(() => `${pathPrefix}/${savedSlug}`, [pathPrefix, savedSlug]);
  const newPath = useMemo(() => `${pathPrefix}/${slug}`, [pathPrefix, slug]);

  async function persist(payload) {
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setSavedTitle(payload.title ?? savedTitle);
      setSavedSlug(payload.slug ?? savedSlug);
      message.success("Saved");
      if (typeof onSaved === "function") onSaved(json.data);
    } catch (e) {
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    if (!dirty) return;
    if (slugChanged && savedSlug) {
      // Show the confirmation modal first so editors see what
      // redirect will be created.
      setShowSlugModal(true);
      return;
    }
    const payload = {};
    if (titleChanged) payload.title = title;
    if (slugChanged) payload.slug = slug;
    persist(payload);
  }

  async function confirmSlugChange() {
    setShowSlugModal(false);
    const payload = {};
    if (titleChanged) payload.title = title;
    payload.slug = slug;
    // The backend's afterPageSave / afterContentItemSave hook always
    // writes a 301. The 302 toggle is preserved here as a UX hint —
    // when 302 is selected we additionally write a manual redirect
    // entry post-save with the chosen status code.
    await persist(payload);
    if (pendingStatusCode === 302) {
      try {
        await fetch("/api/redirects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        // Find the auto-created redirect and patch its statusCode.
        const r = await fetch(`/api/redirects?fromPath=${encodeURIComponent(oldPath)}`);
        const j = await r.json();
        const auto = (j.data ?? [])[0];
        if (auto) {
          await fetch(`/api/redirects/${auto._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ statusCode: 302 }),
          });
        }
      } catch { /* silent — the 301 still works */ }
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          background: "rgba(94, 106, 210, 0.08)",
          border: "1px solid rgba(94, 106, 210, 0.35)",
          borderRadius: 10,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text strong style={{ fontSize: 14 }}>Page identity</Text>
        </div>

        <Form layout="vertical" component="div">
          <Form.Item label="Page Title" style={{ marginBottom: 14 }}>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched && !savedSlug) {
                  setSlug(toSlug(e.target.value));
                }
              }}
              placeholder="Page title"
            />
          </Form.Item>

          <Form.Item label="URL Slug" style={{ marginBottom: 8 }}>
            <Input
              value={slug}
              addonBefore="/"
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(toSlug(e.target.value));
              }}
              placeholder="page-slug"
            />
          </Form.Item>

          <Text type="secondary" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <InfoCircleOutlined />
            Changing this auto-creates a 301 redirect from the old URL.
          </Text>
        </Form>

        {redirects.length > 0 && (
          <div
            style={{
              background: "var(--ant-color-bg-elevated, #1a1a1a)",
              borderRadius: 8,
              padding: "12px 14px",
              fontSize: 13,
            }}
          >
            <div style={{ marginBottom: 6 }}>
              <Text strong style={{ fontSize: 13 }}>
                {redirects.length} redirect{redirects.length === 1 ? "" : "s"} point{redirects.length === 1 ? "s" : ""} here
              </Text>
            </div>
            {redirects.slice(0, 3).map((r) => (
              <div key={r._id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <Text code style={{ fontSize: 12, color: "var(--ant-color-primary, #5e6ad2)" }}>
                  {r.fromPath}
                </Text>
                <Tag color={r.statusCode === 301 ? "success" : "warning"} style={{ margin: 0 }}>
                  {r.statusCode}
                </Tag>
              </div>
            ))}
            <a href="/admin/redirects" style={{ fontSize: 13, marginTop: 8, display: "inline-block" }}>
              View all in Redirects →
            </a>
          </div>
        )}

        <Button
          type="primary"
          loading={saving}
          disabled={!dirty}
          icon={<CheckOutlined />}
          onClick={handleSave}
        >
          Save changes
        </Button>
      </div>

      <Modal
        title={null}
        open={showSlugModal}
        onCancel={() => setShowSlugModal(false)}
        onOk={confirmSlugChange}
        okText="Save & create redirect"
        cancelText="Cancel"
        confirmLoading={saving}
        width={560}
        destroyOnHidden
      >
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 18,
              background: "rgba(250, 173, 20, 0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <WarningOutlined style={{ fontSize: 18, color: "#faad14" }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 16 }}>You're changing this page's URL</Text>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Existing links to the old URL will break unless you create a redirect.
              </Text>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "var(--ant-color-bg-container, #141414)",
            border: "1px solid var(--ant-color-border, #2a2a2a)",
            borderRadius: 8,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Tag color="error" style={{ margin: 0 }}>OLD</Tag>
            <Text code>{oldPath}</Text>
          </div>
          <div style={{ marginLeft: 6, color: "var(--ant-color-text-tertiary, #666)", fontSize: 14 }}>↓</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <Tag color="success" style={{ margin: 0 }}>NEW</Tag>
            <Text code>{newPath}</Text>
          </div>
        </div>

        <Alert
          showIcon
          type="info"
          message="A 301 redirect will be created from the old path to the new path."
          description="Search engines will pass authority to the new URL. Any existing redirects pointing at the old path will be auto-updated to point at the new path (no chains)."
          style={{ marginBottom: 14 }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Text type="secondary">Redirect type:</Text>
          <Radio.Group
            size="small"
            value={pendingStatusCode}
            onChange={(e) => setPendingStatusCode(e.target.value)}
          >
            <Radio.Button value={301}>301 Permanent</Radio.Button>
            <Radio.Button value={302}>302 Temporary</Radio.Button>
          </Radio.Group>
        </div>
      </Modal>
    </div>
  );
}
