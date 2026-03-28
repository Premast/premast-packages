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
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const { Title, Text } = Typography;

export function AdminTemplatesView() {
  const router = useRouter();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content-types");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load templates");
      setTypes(json.data ?? []);
    } catch (e) {
      message.error(e.message);
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const [slugTouched, setSlugTouched] = useState(false);
  const [prefixTouched, setPrefixTouched] = useState(false);

  const toSlug = (text) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const openCreate = () => {
    form.resetFields();
    setSlugTouched(false);
    setPrefixTouched(false);
    setModalOpen(true);
  };

  const openEdit = (id) => {
    router.push(`/admin/templates/${id}`);
  };

  const handleTogglePublished = async (id, published) => {
    try {
      const res = await fetch(`/api/content-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      message.success(published ? "Template published" : "Template unpublished");
      fetchTypes();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/content-types/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      message.success("Template deleted");
      fetchTypes();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const body = JSON.stringify({
        name: values.name,
        slug: values.slug.trim().toLowerCase().replace(/\s+/g, "-"),
        urlPrefix: values.urlPrefix.trim(),
        description: values.description ?? "",
        templateContent: "",
        published: false,
      });
      const res = await fetch("/api/content-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      message.success("Template created");
      setModalOpen(false);
      fetchTypes();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: "Name", dataIndex: "name", key: "name", ellipsis: true },
    {
      title: "URL Prefix",
      dataIndex: "urlPrefix",
      key: "urlPrefix",
      width: 140,
      render: (v) => <Text code>{v}</Text>,
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
            title="Delete this template?"
            description="Only works if no content items use it."
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
          Templates
        </span>
        <Flex gap={8} align="center">
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchTypes}>
            Refresh
          </Button>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New template
          </Button>
        </Flex>
      </Flex>

      <div style={{ padding: 24 }}>
      <Spin spinning={loading}>
        {types.length === 0 && !loading ? (
          <Empty description="No templates yet" style={{ padding: "48px 0" }} />
        ) : (
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={types}
            pagination={false}
            onRow={(record) => ({
              onClick: () => openEdit(record._id),
              style: { cursor: "pointer" },
            })}
          />
        )}
      </Spin>
      </div>

      <Modal
        title="New template"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnHidden
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input
              placeholder="Blog Article"
              onChange={(e) => {
                const slug = toSlug(e.target.value);
                if (!slugTouched) form.setFieldsValue({ slug });
                if (!prefixTouched) form.setFieldsValue({ urlPrefix: slug ? `/${slug}` : "" });
              }}
            />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[{ required: true, message: "Required" }]}
            extra="Auto-generated from name. Edit to customize."
          >
            <Input placeholder="blog-article" onChange={() => setSlugTouched(true)} />
          </Form.Item>
          <Form.Item
            name="urlPrefix"
            label="URL Prefix"
            rules={[
              { required: true, message: "Required" },
              { pattern: /^\/[a-z0-9]+(?:[/-][a-z0-9]+)*$/, message: "Must start with / and contain only lowercase letters, numbers, hyphens (e.g. /blog)" },
            ]}
            extra="Auto-generated from name. Edit to customize."
          >
            <Input placeholder="/blog" onChange={() => setPrefixTouched(true)} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
