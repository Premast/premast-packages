"use client";

import { Card, Typography, Descriptions } from "antd";

const { Title } = Typography;

export function SettingsPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>Settings</Title>
      <Card>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Platform">Premast CMS</Descriptions.Item>
          <Descriptions.Item label="Framework">Next.js</Descriptions.Item>
          <Descriptions.Item label="Database">MongoDB</Descriptions.Item>
          <Descriptions.Item label="Editor">Puck Visual Editor</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
