"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  AppstoreAddOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { AdminPageHeader, AdminPageBody } from "@premast/site-core/admin";

const { Text } = Typography;

export function SymbolsList() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [usage, setUsage] = useState({});
  const [query, setQuery] = useState("");
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/symbols");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load components");
      setItems(json.data || []);
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Usage counts drive both the "Used in" column and the delete warning.
  // Fetched per row after the list lands so a slow/failed count never
  // delays the table itself.
  useEffect(() => {
    let active = true;
    for (const item of items) {
      if (usage[item._id] !== undefined) continue;
      fetch(`/api/symbols/${item._id}/usage`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (active && j?.data) {
            setUsage((prev) => ({ ...prev, [item._id]: j.data.total }));
          }
        })
        .catch(() => {
          /* advisory only — the column just stays blank */
        });
    }
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const openEditor = (id) => router.push(`/admin/components?id=${id}`);

  const handleCreate = async () => {
    const values = await form.validateFields();
    setCreating(true);
    try {
      const res = await fetch("/api/symbols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create component");
      setModalOpen(false);
      form.resetFields();
      openEditor(json.data._id);
    } catch (e) {
      message.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/symbols/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete component");
      message.success("Component deleted");
      setItems((prev) => prev.filter((s) => s._id !== id));
    } catch (e) {
      message.error(e.message);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) || s.slug?.toLowerCase().includes(q),
    );
  }, [items, query]);

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      ellipsis: true,
      render: (name) => <Text strong>{name}</Text>,
    },
    {
      title: "Slug",
      dataIndex: "slug",
      width: 200,
      ellipsis: true,
      render: (s) => <Text code>{s}</Text>,
    },
    {
      title: "Status",
      dataIndex: "published",
      width: 110,
      render: (p) =>
        p ? <Tag color="green">Published</Tag> : <Tag>Draft</Tag>,
    },
    {
      title: "Used in",
      key: "usage",
      width: 100,
      render: (_, row) => {
        const total = usage[row._id];
        if (total === undefined) return <Text type="secondary">—</Text>;
        if (total === 0) return <Text type="secondary">Not used</Text>;
        return (
          <Text>
            {total} {total === 1 ? "place" : "places"}
          </Text>
        );
      },
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      width: 180,
      render: (d) =>
        d ? (
          <Tooltip title={new Date(d).toLocaleString()}>
            <Text type="secondary">{new Date(d).toLocaleDateString()}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 110,
      render: (_, row) => (
        <Flex gap={4} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Edit component">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEditor(row._id)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this component?"
            description={
              usage[row._id] === undefined
                ? "Checking where it's used…"
                : usage[row._id] > 0
                  ? `Used in ${usage[row._id]} place${usage[row._id] === 1 ? "" : "s"}. Those references will stop rendering.`
                  : "Not used anywhere — safe to delete."
            }
            onConfirm={() => handleDelete(row._id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Components"
        description="Reusable sections — build once, reference on any page. Edits apply everywhere."
      >
        {items.length > 0 && (
          <Input
            size="small"
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search components…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 200 }}
          />
        )}
        <Button size="small" icon={<ReloadOutlined />} onClick={load}>
          Refresh
        </Button>
        <Button
          size="small"
          type="primary"
          icon={<AppstoreAddOutlined />}
          onClick={() => setModalOpen(true)}
        >
          New component
        </Button>
      </AdminPageHeader>

      <AdminPageBody>
        <Table
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 800 }}
          onRow={(record) => ({
            onClick: () => openEditor(record._id),
            style: { cursor: "pointer" },
          })}
          pagination={
            filtered.length > 10 ? { pageSize: 10, showSizeChanger: true } : false
          }
          locale={{
            emptyText: query ? (
              <Empty
                description={`No components match “${query}”`}
                style={{ padding: "32px 0" }}
              />
            ) : (
              <Empty
                description="No components yet"
                style={{ padding: "32px 0" }}
              >
                <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                  Build a section once — a logo strip, a CTA, a footer band — then
                  drop it onto any page.
                </Text>
                <Button
                  type="primary"
                  icon={<AppstoreAddOutlined />}
                  onClick={() => setModalOpen(true)}
                >
                  New component
                </Button>
              </Empty>
            ),
          }}
        />
      </AdminPageBody>

      <Modal
        title="New component"
        open={modalOpen}
        onOk={handleCreate}
        confirmLoading={creating}
        onCancel={() => setModalOpen(false)}
        okText="Create & edit"
        destroyOnHidden
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 8 }}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Give the component a name" }]}
            extra="You can rename it later. The slug is generated from this."
          >
            <Input placeholder="e.g. Client Logos, Customer Reviews" autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
