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
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const { Title, Text } = Typography;

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
    } catch {
      /* ignore */
    }
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

  // Sync filter when URL ?type= changes (sidebar navigation)
  useEffect(() => {
    setFilterType(urlType);
  }, [urlType]);

  useEffect(() => {
    fetchContentTypes();
  }, [fetchContentTypes]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openCreate = () => {
    form.resetFields();
    // Pre-select content type from filter or default to first
    if (filterType) {
      form.setFieldValue("contentType", filterType);
    } else if (contentTypes.length === 1) {
      form.setFieldValue("contentType", contentTypes[0]._id);
    }
    setModalOpen(true);
  };

  const openEdit = (id) => {
    router.push(`/admin/content/${id}`);
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

      // Get the selected content type's template to pre-fill the content
      const selectedType = contentTypes.find((t) => t._id === values.contentType);
      let initialContent = "";
      if (selectedType?.templateContent) {
        try {
          // Clone template and mark blocks as template-locked
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
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
    },
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
      render: (v) =>
        v ? <Tag color="processing">Live</Tag> : <Tag>Draft</Tag>,
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
        wrap="wrap"
        gap={12}
        style={{ marginBottom: 16 }}
      >
        <Title level={4} style={{ margin: 0 }}>
          {filterType
            ? contentTypes.find((t) => t._id === filterType)?.name ?? "Content"
            : "All Content"}
        </Title>
        <Flex wrap="wrap" gap={8} align="center">
          <Select
            placeholder="All types"
            allowClear
            value={filterType}
            onChange={(val) => {
              setFilterType(val ?? null);
              // Update URL to keep sidebar in sync
              if (val) {
                router.replace(`/admin/content?type=${val}`, { scroll: false });
              } else {
                router.replace("/admin/content", { scroll: false });
              }
            }}
            style={{ minWidth: 160 }}
            options={contentTypes.map((t) => ({ label: t.name, value: t._id }))}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchItems}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New content
          </Button>
        </Flex>
      </Flex>

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
