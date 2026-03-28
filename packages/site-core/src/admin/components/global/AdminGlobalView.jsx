"use client";

import { ReloadOutlined } from "@ant-design/icons";
import { Button, Empty, Flex, Spin, Switch, Table, Typography, message } from "antd";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const { Text } = Typography;

export function AdminGlobalView() {
  const router = useRouter();
  const [globals, setGlobals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGlobals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/globals");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load globals");
      setGlobals(json.data ?? []);
    } catch (e) {
      message.error(e.message);
      setGlobals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobals();
  }, [fetchGlobals]);

  const openEdit = (key) => {
    router.push(`/admin/global/${key}`);
  };

  const handleTogglePublished = async (key, published) => {
    try {
      const res = await fetch(`/api/globals/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      message.success(published ? "Published" : "Unpublished");
      fetchGlobals();
    } catch (e) {
      message.error(e.message);
    }
  };

  const columns = [
    {
      title: "Element",
      dataIndex: "key",
      key: "key",
      render: (key) => (
        <Text strong style={{ textTransform: "capitalize" }}>
          {key}
        </Text>
      ),
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
            onChange={(checked) => handleTogglePublished(record.key, checked)}
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
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            openEdit(record.key);
          }}
        >
          Edit
        </Button>
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
        <span style={{ fontSize: 14, fontWeight: 500 }}>Global Elements</span>
        <Button size="small" icon={<ReloadOutlined />} onClick={fetchGlobals}>
          Refresh
        </Button>
      </Flex>

      <div style={{ padding: 24 }}>
      <Spin spinning={loading}>
        {globals.length === 0 && !loading ? (
          <Empty
            description="No global elements yet — they will be created on next server restart."
            style={{ padding: "48px 0" }}
          />
        ) : (
          <Table
            rowKey="key"
            columns={columns}
            dataSource={globals}
            pagination={false}
            onRow={(record) => ({
              onClick: () => openEdit(record.key),
              style: { cursor: "pointer" },
            })}
          />
        )}
      </Spin>
      </div>
    </div>
  );
}
