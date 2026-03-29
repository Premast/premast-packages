"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Card,
  Input,
  Select,
  Switch,
  Table,
  Space,
  Typography,
  Alert,
  Popconfirm,
  Modal,
  Form,
  message,
  Tabs,
  Tag,
  Empty,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  EditOutlined,
  ApiOutlined,
  BookOutlined,
} from "@ant-design/icons";

const { Title, Paragraph } = Typography;

async function apiFetch(path, options = {}) {
  const res = await fetch(`/api/${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function TokensTab() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [newToken, setNewToken] = useState(null);

  const loadTokens = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiFetch("mcp/tokens");
      setTokens(data);
    } catch {
      message.error("Failed to load tokens");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const handleCreate = async () => {
    if (!newTokenName.trim()) {
      message.warning("Enter a token name");
      return;
    }
    setCreating(true);
    try {
      const { data } = await apiFetch("mcp/tokens", {
        method: "POST",
        body: JSON.stringify({ name: newTokenName.trim() }),
      });
      setNewToken(data.token);
      setNewTokenName("");
      loadTokens();
      message.success("Token created");
    } catch (err) {
      message.error(err.message);
    }
    setCreating(false);
  };

  const handleRevoke = async (id) => {
    try {
      await apiFetch(`mcp/tokens/${id}`, { method: "DELETE" });
      loadTokens();
      message.success("Token revoked");
    } catch (err) {
      message.error(err.message);
    }
  };

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v) => new Date(v).toLocaleDateString(),
    },
    {
      title: "Last Used",
      dataIndex: "lastUsedAt",
      key: "lastUsedAt",
      render: (v) => (v ? new Date(v).toLocaleDateString() : "Never"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Popconfirm
          title="Revoke this token?"
          description="Any agents using this token will lose access."
          onConfirm={() => handleRevoke(record._id)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small">
            Revoke
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, width: "100%" }}>
        <Input
          placeholder="Token name (e.g. 'Claude Desktop')"
          value={newTokenName}
          onChange={(e) => setNewTokenName(e.target.value)}
          onPressEnter={handleCreate}
          style={{ width: 300 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          loading={creating}
        >
          Generate Token
        </Button>
      </Space>

      {newToken && (
        <Alert
          type="success"
          showIcon
          closable
          onClose={() => setNewToken(null)}
          style={{ marginBottom: 16 }}
          message="Token created — copy it now, it won't be shown again"
          description={
            <Space direction="vertical" style={{ width: "100%" }}>
              <Input.TextArea
                readOnly
                value={newToken}
                autoSize={{ minRows: 1, maxRows: 3 }}
                style={{ fontFamily: "monospace", fontSize: 13 }}
              />
              <Button
                icon={<CopyOutlined />}
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(newToken);
                  message.success("Copied to clipboard");
                }}
              >
                Copy Token
              </Button>
            </Space>
          }
        />
      )}

      <Table
        dataSource={tokens}
        columns={columns}
        rowKey="_id"
        loading={loading}
        size="small"
        pagination={false}
      />
    </div>
  );
}

function ConfigTab() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("remote");

  useEffect(() => {
    apiFetch("mcp/config")
      .then(({ data }) => setConfig(data))
      .catch(() => message.error("Failed to load config"))
      .finally(() => setLoading(false));
  }, []);

  const currentConfig = config?.[mode]?.mcpServers || {};
  const configStr = JSON.stringify({ mcpServers: currentConfig }, null, 2);
  const description = config?.[mode]?.description || "";

  return (
    <div>
      <Paragraph type="secondary">
        Add this configuration to your AI agent&apos;s MCP settings. Replace
        the token value with one generated in the Tokens tab.
      </Paragraph>

      <Tabs
        size="small"
        activeKey={mode}
        onChange={setMode}
        style={{ marginBottom: 12 }}
        items={[
          { key: "remote", label: "Remote (Live Site)" },
          { key: "local", label: "Local (Dev)" },
        ]}
      />

      {!loading && (
        <>
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 8 }}>
            {description}
          </Paragraph>
          <Input.TextArea
            readOnly
            value={configStr}
            autoSize={{ minRows: 6, maxRows: 20 }}
            style={{ fontFamily: "monospace", fontSize: 13, marginBottom: 12 }}
          />
          <Button
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard.writeText(configStr);
              message.success("Config copied to clipboard");
            }}
          >
            Copy Config
          </Button>
        </>
      )}
    </div>
  );
}

const CATEGORIES = [
  { label: "Brand", value: "brand" },
  { label: "Design", value: "design" },
  { label: "Content", value: "content" },
  { label: "SEO", value: "seo" },
  { label: "General", value: "general" },
];

const CATEGORY_COLORS = {
  brand: "purple",
  design: "blue",
  content: "green",
  seo: "orange",
  general: "default",
};

function InstructionsTab() {
  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const loadInstructions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiFetch("mcp/instructions");
      setInstructions(data);
    } catch {
      message.error("Failed to load instructions");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInstructions();
  }, [loadInstructions]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await apiFetch(`mcp/instructions/${editing._id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
        message.success("Instruction updated");
      } else {
        await apiFetch("mcp/instructions", {
          method: "POST",
          body: JSON.stringify(values),
        });
        message.success("Instruction created");
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      loadInstructions();
    } catch (err) {
      if (err.message) message.error(err.message);
    }
  };

  const handleEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ category: "general", enabled: true, order: 0 });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiFetch(`mcp/instructions/${id}`, { method: "DELETE" });
      message.success("Instruction deleted");
      loadInstructions();
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleToggle = async (record, enabled) => {
    try {
      await apiFetch(`mcp/instructions/${record._id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      loadInstructions();
    } catch (err) {
      message.error(err.message);
    }
  };

  return (
    <div>
      <Space
        style={{
          marginBottom: 16,
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <Typography.Text type="secondary">
          Instructions guide AI agents when creating or editing content. Agents
          read these before making changes.
        </Typography.Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Add Instruction
        </Button>
      </Space>

      {loading ? null : instructions.length === 0 ? (
        <Empty
          image={<BookOutlined style={{ fontSize: 48, color: "#ccc" }} />}
          description="No instructions yet"
        >
          <Button type="primary" onClick={handleAdd}>
            Add Your First Instruction
          </Button>
        </Empty>
      ) : (
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          {instructions.map((inst) => (
            <Card
              key={inst._id}
              size="small"
              title={
                <Space>
                  <Tag color={CATEGORY_COLORS[inst.category]}>
                    {inst.category}
                  </Tag>
                  <span style={{ opacity: inst.enabled ? 1 : 0.5 }}>
                    {inst.title}
                  </span>
                </Space>
              }
              extra={
                <Space size="small">
                  <Switch
                    size="small"
                    checked={inst.enabled}
                    onChange={(v) => handleToggle(inst, v)}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(inst)}
                  />
                  <Popconfirm
                    title="Delete this instruction?"
                    onConfirm={() => handleDelete(inst._id)}
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                    />
                  </Popconfirm>
                </Space>
              }
            >
              <Typography.Text
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  opacity: inst.enabled ? 1 : 0.5,
                }}
              >
                {inst.content}
              </Typography.Text>
            </Card>
          ))}
        </Space>
      )}

      <Modal
        title={editing ? "Edit Instruction" : "New Instruction"}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        okText={editing ? "Save" : "Create"}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input placeholder="e.g. Brand Colors, Writing Tone, Layout Rules" />
          </Form.Item>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true }]}
          >
            <Select options={CATEGORIES} />
          </Form.Item>
          <Form.Item
            name="content"
            label="Instruction Content"
            rules={[{ required: true, message: "Content is required" }]}
          >
            <Input.TextArea
              rows={6}
              placeholder={
                "Write clear instructions for the AI agent.\n\nExample:\n- Primary color: #1890ff\n- Always use sentence case for headings\n- Max 2 CTA buttons per page"
              }
            />
          </Form.Item>
          <Space>
            <Form.Item name="order" label="Order">
              <Input type="number" style={{ width: 80 }} />
            </Form.Item>
            <Form.Item name="enabled" label="Enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}

export function McpAdminPage() {
  const items = [
    {
      key: "instructions",
      label: "Instructions",
      children: <InstructionsTab />,
    },
    {
      key: "tokens",
      label: "API Tokens",
      children: <TokensTab />,
    },
    {
      key: "config",
      label: "MCP Config",
      children: <ConfigTab />,
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        <ApiOutlined style={{ fontSize: 24 }} />
        <Title level={3} style={{ margin: 0 }}>
          MCP Settings
        </Title>
      </Space>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Connect AI agents to your CMS via the Model Context Protocol. Generate
        tokens and get the config for your agent. Blocks are discovered
        automatically from installed plugins and your site&apos;s components.
      </Paragraph>
      <Tabs items={items} />
    </div>
  );
}
