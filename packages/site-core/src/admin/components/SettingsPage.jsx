"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Typography, Descriptions, Switch, Spin, message } from "antd";

const { Title } = Typography;

async function apiFetch(path, options = {}) {
  const res = await fetch(`/api/${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiFetch("settings");
      setSettings(data || {});
    } catch {
      // No settings yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(key, checked) {
    setSaving(true);
    try {
      const { data } = await apiFetch("settings", {
        method: "PATCH",
        body: JSON.stringify({ [key]: checked }),
      });
      setSettings(data);
      message.success("Setting saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spin style={{ display: "block", margin: "48px auto" }} />;

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>Settings</Title>

      <Card title="SEO & Crawling" style={{ marginBottom: 24 }}>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Block AI Bots">
            <Switch
              checked={settings.blockAiBots ?? false}
              onChange={(checked) => toggle("blockAiBots", checked)}
              loading={saving}
            />
            <span style={{ marginLeft: 12, color: "#888" }}>
              Block ClaudeBot, GPTBot, Google-Extended, and other AI crawlers in robots.txt
            </span>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Platform">
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
