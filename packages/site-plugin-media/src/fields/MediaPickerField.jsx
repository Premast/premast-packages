"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Empty,
  Input,
  Modal,
  Spin,
  Typography,
  Upload,
  message,
  theme as antdTheme,
} from "antd";
import {
  DeleteOutlined,
  InboxOutlined,
  PictureOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { uploadMediaFile } from "../client/upload.js";

const { Text } = Typography;

/**
 * Puck custom field: stores a plain URL string (same shape as
 * `{ type: "text" }`) so it's drop-in compatible with existing blocks
 * that already store image URLs.
 *
 * Renders a thumbnail preview + "Choose" button. Clicking opens a
 * modal with the media library and an upload dropzone.
 */
export function MediaPickerField({ value, onChange, name, field }) {
  const [open, setOpen] = useState(false);
  const label = field?.label || name;

  const handlePick = useCallback(
    (url) => {
      onChange(url);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div>
      {label && (
        <div style={{ fontSize: 12, color: "var(--puck-color-grey-05, #6b7280)", marginBottom: 6 }}>
          {label}
        </div>
      )}
      <PreviewRow value={value} onClear={() => onChange("")} onOpen={() => setOpen(true)} />
      <Input
        size="small"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://… or click Choose to upload"
        style={{ marginTop: 8 }}
      />
      <MediaPickerModal open={open} onClose={() => setOpen(false)} onPick={handlePick} />
    </div>
  );
}

function PreviewRow({ value, onClear, onOpen }) {
  const { token } = antdTheme.useToken();
  const isImage = typeof value === "string" && /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(value);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: 8,
        border: `1px dashed ${token.colorBorder}`,
        borderRadius: 6,
        background: token.colorFillQuaternary,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 4,
          background: token.colorBgContainer,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {value && isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <PictureOutlined style={{ color: token.colorTextTertiary, fontSize: 18 }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontSize: 12, display: "block" }}
          ellipsis={{ tooltip: value || "No file chosen" }}
        >
          {value || <span style={{ color: token.colorTextTertiary }}>No file chosen</span>}
        </Text>
      </div>
      <Button size="small" icon={<UploadOutlined />} onClick={onOpen}>
        Choose
      </Button>
      {value && (
        <Button size="small" icon={<DeleteOutlined />} danger onClick={onClear} />
      )}
    </div>
  );
}

function MediaPickerModal({ open, onClose, onPick }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const reqSeq = useRef(0);

  const fetchItems = useCallback(
    async (query = "") => {
      setLoading(true);
      const seq = ++reqSeq.current;
      try {
        const url = query
          ? `/api/media?q=${encodeURIComponent(query)}&limit=100`
          : `/api/media?limit=100`;
        const res = await fetch(url);
        const json = await res.json();
        if (seq !== reqSeq.current) return;
        if (!res.ok) throw new Error(json.error || "Failed to load media");
        setItems(json.data || []);
      } catch (e) {
        message.error(e.message);
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (open) fetchItems("");
  }, [open, fetchItems]);

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const saved = await uploadMediaFile(file);
      message.success("Uploaded");
      setItems((prev) => [saved, ...prev]);
    } catch (e) {
      message.error(e.message);
    } finally {
      setUploading(false);
    }
    return Upload.LIST_IGNORE;
  };

  return (
    <Modal
      title="Media library"
      open={open}
      onCancel={onClose}
      footer={null}
      width={880}
      destroyOnHidden
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Input.Search
          placeholder="Search by filename…"
          allowClear
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onSearch={(v) => fetchItems(v)}
          style={{ flex: 1 }}
        />
      </div>

      <Upload.Dragger
        multiple={false}
        showUploadList={false}
        accept="image/*,video/*,application/pdf"
        beforeUpload={(file) => {
          handleUpload(file);
          return false;
        }}
        disabled={uploading}
        style={{ marginBottom: 16 }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          {uploading ? "Uploading…" : "Click or drag a file here to upload"}
        </p>
      </Upload.Dragger>

      <Spin spinning={loading}>
        {items.length === 0 && !loading ? (
          <Empty description="No media yet — upload your first file above" />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 10,
              maxHeight: 380,
              overflowY: "auto",
            }}
          >
            {items.map((m) => (
              <MediaTile key={m._id} item={m} onClick={() => onPick(m.url)} />
            ))}
          </div>
        )}
      </Spin>
    </Modal>
  );
}

function MediaTile({ item, onClick }) {
  const { token } = antdTheme.useToken();
  const isImage = item.mime?.startsWith("image/");
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 6,
        padding: 0,
        background: token.colorBgContainer,
        cursor: "pointer",
        overflow: "hidden",
        textAlign: "left",
      }}
    >
      <div
        style={{
          aspectRatio: "1 / 1",
          background: token.colorFillQuaternary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.alt || item.filename}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <PictureOutlined style={{ fontSize: 28, color: token.colorTextTertiary }} />
        )}
      </div>
      <div style={{ padding: "6px 8px" }}>
        <Text ellipsis style={{ fontSize: 11, display: "block" }}>
          {item.filename || item.key.split("/").pop()}
        </Text>
      </div>
    </button>
  );
}
