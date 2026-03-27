"use client";

import { ReloadOutlined } from "@ant-design/icons";
import { Button, Empty, Flex, Spin, Table, Tag, Typography, message } from "antd";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const { Title, Text } = Typography;

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
        wrap="wrap"
        gap={12}
        style={{ marginBottom: 16 }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Global Elements
        </Title>
        <Button icon={<ReloadOutlined />} onClick={fetchGlobals}>
          Refresh
        </Button>
      </Flex>

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
  );
}
