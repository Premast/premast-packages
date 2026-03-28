"use client";

import { Button, Table, Tag, Modal, Form, Input, Select, message, Flex, Popconfirm } from "antd";
import { PlusOutlined, DeleteOutlined, KeyOutlined, ReloadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";

const ROLE_COLORS = { super_admin: "red", editor: "blue" };

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/users");
      const json = await res.json();
      if (res.ok) setUsers(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleCreate(values) {
    setCreating(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      message.success("User created");
      setModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (err) {
      message.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(id, role) {
    try {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      message.success("Role updated");
      fetchUsers();
    } catch (err) {
      message.error(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/auth/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      message.success("User deleted");
      fetchUsers();
    } catch (err) {
      message.error(err.message);
    }
  }

  async function handleResetPassword(values) {
    setResetting(true);
    try {
      const res = await fetch(`/api/auth/users/${resetUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: values.password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      message.success("Password updated");
      setResetModalOpen(false);
      resetForm.resetFields();
    } catch (err) {
      message.error(err.message);
    } finally {
      setResetting(false);
    }
  }

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role, record) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Select
            value={role}
            size="small"
            style={{ width: 140 }}
            onChange={(v) => handleRoleChange(record._id, v)}
            options={[
              { label: "Super Admin", value: "super_admin" },
              { label: "Editor", value: "editor" },
            ]}
          />
        </div>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => new Date(d).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Flex gap={4} onClick={(e) => e.stopPropagation()}>
          <Button
            type="text"
            size="small"
            icon={<KeyOutlined />}
            onClick={() => {
              setResetUserId(record._id);
              resetForm.resetFields();
              setResetModalOpen(true);
            }}
          />
          <Popconfirm title="Delete this user?" onConfirm={() => handleDelete(record._id)}>
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
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
        <span style={{ fontSize: 14, fontWeight: 500 }}>Users</span>
        <Flex gap={8} align="center">
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchUsers}>
            Refresh
          </Button>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Add User
          </Button>
        </Flex>
      </Flex>

      <div style={{ padding: 24 }}>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={false}
          size="small"
        />
      </div>

      <Modal
        title="Add User"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} requiredMark={false}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true }, { min: 8, message: "At least 8 characters" }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" initialValue="editor">
            <Select
              options={[
                { label: "Editor", value: "editor" },
                { label: "Super Admin", value: "super_admin" },
              ]}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={creating}>
              Create User
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Reset Password"
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={resetForm} layout="vertical" onFinish={handleResetPassword} requiredMark={false}>
          <Form.Item
            name="password"
            label="New Password"
            rules={[{ required: true }, { min: 8, message: "At least 8 characters" }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={resetting}>
              Update Password
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
