"use client";

import {
  AppstoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  TableOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
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

export function AdminPagesView() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState("table");
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pages");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load pages");
      setPages(json.data ?? []);
    } catch (e) {
      message.error(e.message);
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ published: false, content: "" });
    setModalOpen(true);
  };

  const openEdit = (recordId) => {
    router.push(`/admin/pages/${recordId}`);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/pages/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      message.success("Page deleted");
      fetchPages();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const body = JSON.stringify({
        title: values.title,
        slug: values.slug.trim().toLowerCase().replace(/\s+/g, "-"),
        content: values.content ?? "",
        published: values.published,
      });
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      message.success("Page created");
      setModalOpen(false);
      fetchPages();
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
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
      width: 180,
      ellipsis: true,
      render: (slug) => <Text code>{slug}</Text>,
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
        <Flex gap={4} onClick={(event) => event.stopPropagation()}>
          <Button
            type="link"
            size="small"
            onClick={() => openEdit(record._id)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this page?"
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
          Pages
        </Title>
        <Flex wrap="wrap" gap={8}>
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              {
                label: (
                  <span>
                    <TableOutlined /> Table
                  </span>
                ),
                value: "table",
              },
              {
                label: (
                  <span>
                    <AppstoreOutlined /> Grid
                  </span>
                ),
                value: "grid",
              },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchPages}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New page
          </Button>
        </Flex>
      </Flex>

      <Spin spinning={loading}>
        {pages.length === 0 && !loading ? (
          <Empty description="No pages yet" style={{ padding: "48px 0" }} />
        ) : viewMode === "table" ? (
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={pages}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 800 }}
            onRow={(record) => ({
              onClick: () => openEdit(record._id),
              style: { cursor: "pointer" },
            })}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {pages.map((p) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={p._id}>
                <Card
                  title={p.title}
                  size="small"
                  extra={
                    p.published ? (
                      <Tag color="processing">Live</Tag>
                    ) : (
                      <Tag>Draft</Tag>
                    )
                  }
                  actions={[
                    <Button
                      key="edit"
                      type="link"
                      size="small"
                      onClick={() => openEdit(p._id)}
                    >
                      Edit
                    </Button>,
                    <Popconfirm
                      key="del"
                      title="Delete this page?"
                      onConfirm={() => handleDelete(p._id)}
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                    >
                      <Button type="link" size="small" danger>
                        Delete
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <Text type="secondary" ellipsis>
                    /{p.slug}
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {p.updatedAt
                        ? new Date(p.updatedAt).toLocaleString()
                        : ""}
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <Modal
        title="New page"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnHidden
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input
              placeholder="Page title"
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
            extra="Lowercase letters, numbers, and hyphens (e.g. about-us)"
          >
            <Input placeholder="about-us" />
          </Form.Item>
          <Form.Item name="content" label="Content">
            <Input.TextArea rows={6} placeholder="Body (optional)" />
          </Form.Item>
          <Form.Item name="published" label="Published" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
