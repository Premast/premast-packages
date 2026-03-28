"use client";

import { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Typography, Spin } from "antd";
import { FileOutlined, GlobalOutlined, BlockOutlined, FolderOutlined } from "@ant-design/icons";

const { Title } = Typography;

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [pagesRes, globalsRes] = await Promise.all([
          fetch("/api/pages?published=true"),
          fetch("/api/globals?published=true"),
        ]);
        const pages = pagesRes.ok ? (await pagesRes.json()).data : [];
        const globals = globalsRes.ok ? (await globalsRes.json()).data : [];
        setStats({
          pages: pages.length,
          globals: globals.length,
        });
      } catch {
        setStats({ pages: 0, globals: 0 });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>Dashboard</Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="Published Pages"
              value={stats?.pages ?? 0}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            <Statistic
              title="Globals"
              value={stats?.globals ?? 0}
              prefix={<GlobalOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
