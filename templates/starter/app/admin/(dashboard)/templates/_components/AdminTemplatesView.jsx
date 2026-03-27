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

  const openCreate = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (id) => {
    router.push(`/admin/templates/${id}`);
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
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
    },
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
        wrap="wrap"
        gap={12}
        style={{ marginBottom: 16 }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Templates
        </Title>
        <Flex wrap="wrap" gap={8}>
          <Button icon={<ReloadOutlined />} onClick={fetchTypes}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New template
          </Button>
        </Flex>
      </Flex>

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
            <Input placeholder="Blog Article" />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[{ required: true, message: "Required" }]}
            extra="Lowercase, hyphens (e.g. blog-article)"
          >
            <Input placeholder="blog-article" />
          </Form.Item>
          <Form.Item
            name="urlPrefix"
            label="URL Prefix"
            rules={[{ required: true, message: "Required" }]}
            extra="Public URL path prefix (e.g. /blog)"
          >
            <Input placeholder="/blog" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
