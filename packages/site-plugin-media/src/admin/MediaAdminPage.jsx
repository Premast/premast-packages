"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Input,
  Modal,
  Popconfirm,
  Row,
  Spin,
  Typography,
  Upload,
  message,
  theme as antdTheme,
} from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  InboxOutlined,
  PictureOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { uploadMediaFile } from "../client/upload.js";

const { Text } = Typography;

function StatCard({ label, value, sub, accent }) {
  const { token } = antdTheme.useToken();
  return (
    <Card size="small" styles={{ body: { padding: 16 } }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.08em",
          color: token.colorTextSecondary,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <div
        style={{
          fontSize: 24,
          fontWeight: 600,
          marginTop: 4,
          color: accent ?? token.colorText,
        }}
      >
        {value}
      </div>
      <Text type="secondary" style={{ fontSize: 11 }}>
        {sub}
      </Text>
    </Card>
  );
}

export function MediaAdminPage() {
  const { token } = antdTheme.useToken();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null);
  const reqSeq = useRef(0);

  const fetchItems = useCallback(async (query = "") => {
    setLoading(true);
    const seq = ++reqSeq.current;
    try {
      const url = query
        ? `/api/media?q=${encodeURIComponent(query)}&limit=200`
        : `/api/media?limit=200`;
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
  }, []);

  useEffect(() => {
    fetchItems("");
  }, [fetchItems]);

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

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setItems((prev) => prev.filter((m) => m._id !== id));
      message.success("Deleted");
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleCopyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      message.success("URL copied");
    } catch {
      message.error("Copy failed");
    }
  };

  const totalSize = items.reduce((sum, m) => sum + (m.size || 0), 0);

  return (
    <div>
      <Flex
        align="center"
        justify="space-between"
        style={{
          height: 56,
          padding: "0 24px",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500 }}>Media</span>
        <Flex gap={8} align="center">
          <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchItems(search)}>
            Refresh
          </Button>
        </Flex>
      </Flex>

      <div style={{ padding: 24 }}>
        <Flex justify="flex-end" style={{ marginBottom: 12 }}>
          <Input
            allowClear
            placeholder="Search by filename…"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => fetchItems(search)}
            style={{ width: 280 }}
          />
        </Flex>

        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={8}>
            <StatCard label="Files" value={items.length} sub="In library" />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard
              label="Total size"
              value={formatBytes(totalSize)}
              sub="Across all files"
              accent={token.colorPrimary}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard
              label="Storage"
              value="DO Spaces"
              sub="S3-compatible"
              accent="#52c41a"
            />
          </Col>
        </Row>

        <Upload.Dragger
          multiple
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
            {uploading ? "Uploading…" : "Click or drag files here to upload"}
          </p>
          <p className="ant-upload-hint">Uploads go directly to your Spaces bucket.</p>
        </Upload.Dragger>

        <Spin spinning={loading}>
          {items.length === 0 && !loading ? (
            <Empty description="No media yet" style={{ padding: "48px 0" }} />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {items.map((m) => (
                <MediaCard
                  key={m._id}
                  item={m}
                  onClick={() => setPreview(m)}
                  onCopy={() => handleCopyUrl(m.url)}
                  onDelete={() => handleDelete(m._id)}
                />
              ))}
            </div>
          )}
        </Spin>
      </div>

      <Modal
        title={preview?.filename || "Preview"}
        open={!!preview}
        onCancel={() => setPreview(null)}
        footer={null}
        width={680}
        destroyOnHidden
      >
        {preview && <PreviewDetails item={preview} onCopy={() => handleCopyUrl(preview.url)} />}
      </Modal>
    </div>
  );
}

function MediaCard({ item, onClick, onCopy, onDelete }) {
  const { token } = antdTheme.useToken();
  const isImage = item.mime?.startsWith("image/");
  return (
    <div
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 8,
        overflow: "hidden",
        background: token.colorBgContainer,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          width: "100%",
          border: "none",
          padding: 0,
          background: token.colorFillQuaternary,
          cursor: "pointer",
          display: "block",
          aspectRatio: "4 / 3",
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
          <Flex align="center" justify="center" style={{ width: "100%", height: "100%" }}>
            <PictureOutlined style={{ fontSize: 32, color: token.colorTextTertiary }} />
          </Flex>
        )}
      </button>
      <div style={{ padding: 10 }}>
        <Text ellipsis style={{ fontSize: 12, display: "block", fontWeight: 500 }}>
          {item.filename || item.key.split("/").pop()}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {formatBytes(item.size || 0)}
        </Text>
        <Flex gap={4} style={{ marginTop: 8 }}>
          <Button size="small" icon={<CopyOutlined />} onClick={onCopy}>
            Copy URL
          </Button>
          <Popconfirm
            title="Delete this file?"
            onConfirm={onDelete}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Flex>
      </div>
    </div>
  );
}

function PreviewDetails({ item, onCopy }) {
  const isImage = item.mime?.startsWith("image/");
  return (
    <div>
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={item.alt || item.filename}
          style={{ width: "100%", borderRadius: 6, marginBottom: 12 }}
        />
      ) : (
        <Empty description="Preview not available for this file type" />
      )}
      <Flex vertical gap={6}>
        <Text style={{ fontSize: 12 }}>
          <strong>URL:</strong>{" "}
          <a href={item.url} target="_blank" rel="noreferrer">
            {item.url}
          </a>
        </Text>
        <Text style={{ fontSize: 12 }}>
          <strong>Type:</strong> {item.mime || "unknown"}
        </Text>
        <Text style={{ fontSize: 12 }}>
          <strong>Size:</strong> {formatBytes(item.size || 0)}
        </Text>
        {item.width && item.height && (
          <Text style={{ fontSize: 12 }}>
            <strong>Dimensions:</strong> {item.width}×{item.height}
          </Text>
        )}
        <Text style={{ fontSize: 12 }}>
          <strong>Uploaded:</strong>{" "}
          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
        </Text>
      </Flex>
      <Flex justify="flex-end" style={{ marginTop: 12 }}>
        <Button icon={<CopyOutlined />} onClick={onCopy}>
          Copy URL
        </Button>
      </Flex>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
