"use client";

import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const { Title, Text } = Typography;

function getSeoScore(content) {
  try {
    const parsed = JSON.parse(content || "{}");
    const root = parsed?.root?.props || {};
    const checks = [
      Boolean(root.metaTitle),
      Boolean(root.metaDescription),
      Boolean(root.ogImage),
      root.noIndex !== "true" && root.noIndex !== true,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  } catch {
    return 0;
  }
}

function SeoScoreBadge({ score }) {
  const color = score >= 80 ? "#52c41a" : score >= 50 ? "#faad14" : "#ff4d4f";
  const size = 18;
  const r = (size / 2) - 2;
  const circumference = 2 * Math.PI * r;
  const arc = (score / 100) * circumference;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color }}>{score}</span>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#353535" strokeWidth={2} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={2}
          strokeDasharray={`${arc} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
    </span>
  );
}

export function AdminContentView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlType = searchParams.get("type");
  const [items, setItems] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [filterType, setFilterType] = useState(urlType);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchContentTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/content-types");
      const json = await res.json();
      if (res.ok) setContentTypes(json.data ?? []);
    } catch { /* ignore */ }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("contentType", filterType);
      const res = await fetch(`/api/content-items?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load content");
      setItems(json.data ?? []);
    } catch (e) {
      message.error(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { setFilterType(urlType); }, [urlType]);
  useEffect(() => { fetchContentTypes(); }, [fetchContentTypes]);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => {
    form.resetFields();
    if (filterType) {
      form.setFieldValue("contentType", filterType);
    } else if (contentTypes.length === 1) {
      form.setFieldValue("contentType", contentTypes[0]._id);
    }
    setModalOpen(true);
  };

  const openEdit = (id) => { router.push(`/admin/content/${id}`); };

  const handleTogglePublished = async (id, published) => {
    try {
      const res = await fetch(`/api/content-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      message.success(published ? "Content published" : "Content unpublished");
      fetchItems();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/content-items/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      message.success("Content deleted");
      fetchItems();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const selectedType = contentTypes.find((t) => t._id === values.contentType);
      let initialContent = "";
      if (selectedType?.templateContent) {
        try {
          const tpl = JSON.parse(selectedType.templateContent);
          const locked = {
            ...tpl,
            content: (tpl.content ?? []).map((block) => ({
              ...block,
              props: { ...block.props, _templateLocked: true },
            })),
          };
          initialContent = JSON.stringify(locked);
        } catch {
          initialContent = selectedType.templateContent;
        }
      }

      const body = JSON.stringify({
        title: values.title,
        slug: values.slug.trim().toLowerCase().replace(/\s+/g, "-"),
        contentType: values.contentType,
        content: initialContent,
        published: false,
      });

      const res = await fetch("/api/content-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      message.success("Content created");
      setModalOpen(false);
      fetchItems();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: "Title", dataIndex: "title", key: "title", ellipsis: true },
    {
      title: "Type",
      dataIndex: ["contentType", "name"],
      key: "type",
      width: 140,
      render: (v) => <Tag>{v || "—"}</Tag>,
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
      width: 160,
      ellipsis: true,
      render: (slug, record) => {
        const prefix = record.contentType?.urlPrefix ?? "";
        return <Text code>{prefix}/{slug}</Text>;
      },
    },
    {
      title: "Published",
      dataIndex: "published",
      key: "published",
      width: 110,
      render: (v, record) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            size="small"
            checked={v}
            onChange={(checked) => handleTogglePublished(record._id, checked)}
          />
        </div>
      ),
    },
    {
      title: "SEO",
      key: "seo",
      width: 70,
      render: (_, record) => <SeoScoreBadge score={getSeoScore(record.content)} />,
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (d) => (d ? new Date(d).toLocaleString() : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <Flex gap={4} onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => openEdit(record._id)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this content?"
            description="This cannot be undone."
            onConfirm={() => handleDelete(record._id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  return (
    <div>
      <Flex
        align="center"
        justify="space-between"
        style={{
          height: 56,
          padding: "0 24px",
          borderBottom: "1px solid var(--ant-color-border-secondary, rgba(255,255,255,0.06))",
          background: "var(--ant-color-bg-container, #141414)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500 }}>
          {filterType
            ? contentTypes.find((t) => t._id === filterType)?.name ?? "Content"
            : "All Content"}
        </span>
        <Flex gap={8} align="center">
          <Select
            size="small"
            placeholder="All types"
            allowClear
            value={filterType}
            onChange={(val) => {
              setFilterType(val ?? null);
              if (val) {
                router.replace(`/admin/content?type=${val}`, { scroll: false });
              } else {
                router.replace("/admin/content", { scroll: false });
              }
            }}
            style={{ minWidth: 140 }}
            options={contentTypes.map((t) => ({ label: t.name, value: t._id }))}
          />
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchItems}>
            Refresh
          </Button>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New content
          </Button>
        </Flex>
      </Flex>

      <div style={{ padding: 24 }}>
      <Spin spinning={loading}>
        {items.length === 0 && !loading ? (
          <Empty description="No content yet" style={{ padding: "48px 0" }} />
        ) : (
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={items}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 800 }}
            onRow={(record) => ({
              onClick: () => openEdit(record._id),
              style: { cursor: "pointer" },
            })}
          />
        )}
      </Spin>
      </div>

      <Modal
        title="New content"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnHidden
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="contentType"
            label="Content Type"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select
              placeholder="Select a template"
              options={contentTypes.map((t) => ({ label: t.name, value: t._id }))}
            />
          </Form.Item>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input
              placeholder="My New Article"
              onChange={(e) => {
                const slug = e.target.value
                  .toLowerCase()
                  .trim()
                  .replace(/[^a-z0-9\s-]/g, "")
                  .replace(/\s+/g, "-")
                  .replace(/-+/g, "-");
                form.setFieldValue("slug", slug);
              }}
            />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[{ required: true, message: "Required" }]}
            extra="Lowercase letters, numbers, and hyphens"
          >
            <Input placeholder="my-new-article" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
