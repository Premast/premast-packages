"use client";

import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
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
  Select,
  Spin,
  Table,
  Tag,
  Typography,
  message,
  theme as antdTheme,
} from "antd";
import { useCallback, useEffect, useState } from "react";

const { Text } = Typography;

function StatCard({ label, value, sub, accent }) {
  const { token } = antdTheme.useToken();
  return (
    <Card size="small" styles={{ body: { padding: 16 } }}>
      <Text style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", color: token.colorTextSecondary, textTransform: "uppercase" }}>
        {label}
      </Text>
      <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: accent ?? token.colorText }}>
        {value}
      </div>
      <Text type="secondary" style={{ fontSize: 11 }}>{sub}</Text>
    </Card>
  );
}

export function AdminRedirectsView() {
  const { token } = antdTheme.useToken();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, autoCount: 0, hits7d: 0, chains: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/redirects");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load redirects");
      setItems(json.data ?? []);
      setStats(json.stats ?? { total: 0, autoCount: 0, hits7d: 0, chains: 0 });
    } catch (e) {
      message.error(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ statusCode: 301 });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue({
      fromPath: record.fromPath,
      toPath: record.toPath,
      statusCode: record.statusCode,
      locale: record.locale || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/redirects/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      message.success("Redirect deleted");
      fetchData();
    } catch (e) {
      message.error(e.message);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        fromPath: values.fromPath?.trim(),
        toPath: values.toPath?.trim(),
        statusCode: values.statusCode === 302 ? 302 : 301,
        locale: values.locale?.trim() || null,
      };
      const url = editing ? `/api/redirects/${editing._id}` : "/api/redirects";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      message.success(editing ? "Redirect updated" : "Redirect created");
      setModalOpen(false);
      fetchData();
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = search
    ? items.filter(
        (r) =>
          r.fromPath.includes(search.toLowerCase()) ||
          r.toPath.includes(search.toLowerCase()),
      )
    : items;

  const columns = [
    {
      title: "From",
      dataIndex: "fromPath",
      key: "fromPath",
      render: (p) => <Text code>{p}</Text>,
    },
    {
      title: "To",
      dataIndex: "toPath",
      key: "toPath",
      render: (p) => <Text code style={{ color: token.colorPrimary }}>→ {p}</Text>,
    },
    {
      title: "Code",
      dataIndex: "statusCode",
      key: "statusCode",
      width: 80,
      render: (c) => (
        <Tag color={c === 301 ? "success" : "warning"}>{c}</Tag>
      ),
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      width: 130,
      render: (s) => (
        <Tag color={s === "auto-slug-change" ? "processing" : "default"}>
          {s === "auto-slug-change" ? "auto-slug" : "manual"}
        </Tag>
      ),
    },
    {
      title: "Hits",
      dataIndex: "hits",
      key: "hits",
      width: 80,
    },
    {
      title: "Last hit",
      dataIndex: "lastHitAt",
      key: "lastHitAt",
      width: 140,
      render: (d) => (d ? new Date(d).toLocaleString() : "—"),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      render: (d) => (d ? new Date(d).toLocaleString() : "—"),
    },
    {
      title: "",
      key: "actions",
      width: 140,
      render: (_, record) => (
        <Flex gap={4}>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this redirect?"
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
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500 }}>Redirects</span>
        <Flex gap={8} align="center">
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchData}>
            Refresh
          </Button>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            New redirect
          </Button>
        </Flex>
      </Flex>

      <div style={{ padding: 24 }}>
        <Flex justify="flex-end" style={{ marginBottom: 12 }}>
          <Input
            allowClear
            placeholder="Search by path…"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
        </Flex>
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Total" value={stats.total} sub="Active redirects" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Auto-created" value={stats.autoCount} sub="From slug changes" accent={token.colorPrimary} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard label="Hits — 7 days" value={stats.hits7d.toLocaleString()} sub="Across all redirects" accent="#52c41a" />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              label="Chains detected"
              value={stats.chains}
              sub={stats.chains === 0 ? "Healthy" : "Review needed"}
              accent={stats.chains === 0 ? "#52c41a" : "#faad14"}
            />
          </Col>
        </Row>

        <Spin spinning={loading}>
          {filtered.length === 0 && !loading ? (
            <Empty description="No redirects yet" style={{ padding: "48px 0" }} />
          ) : (
            <Table
              rowKey="_id"
              columns={columns}
              dataSource={filtered}
              pagination={{ pageSize: 25, showSizeChanger: true }}
              scroll={{ x: 900 }}
              size="middle"
            />
          )}
        </Spin>
      </div>

      <Modal
        title={editing ? "Edit redirect" : "New redirect"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="fromPath"
            label="From path"
            rules={[
              { required: true, message: "Required" },
              { pattern: /^\/.*/, message: "Must start with /" },
            ]}
            extra="The URL to redirect FROM. Must start with /"
          >
            <Input placeholder="/old-url" />
          </Form.Item>
          <Form.Item
            name="toPath"
            label="To path"
            rules={[
              { required: true, message: "Required" },
              { pattern: /^\/.*/, message: "Must start with /" },
            ]}
            extra="The URL to redirect TO. Must start with /"
          >
            <Input placeholder="/new-url" />
          </Form.Item>
          <Form.Item name="statusCode" label="Status code">
            <Select
              options={[
                { value: 301, label: "301 — Permanent (recommended)" },
                { value: 302, label: "302 — Temporary" },
              ]}
            />
          </Form.Item>
          <Form.Item name="locale" label="Locale (optional)" extra="Leave blank to apply to all locales">
            <Input placeholder="e.g. en, ar" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
