"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Typography, Switch, Input, Button, Spin, Tag, message } from "antd";
import * as AntIcons from "@ant-design/icons";

const { Title, Text } = Typography;
const { TextArea } = Input;

/**
 * Provider descriptors drive the whole UI. Adding a provider = one entry here
 * plus a matching snippet builder in the analytics injector (site-settings).
 * Each field's `key` is stored under `integrations[provider.key][field.key]`.
 */
const PROVIDERS = [
  {
    key: "googleAnalytics",
    label: "Google Analytics 4",
    desc: "Pageviews and event tracking",
    icon: "LineChartOutlined",
    fields: [{ key: "measurementId", label: "Measurement ID", placeholder: "G-XXXXXXXXXX" }],
  },
  {
    key: "googleTagManager",
    label: "Google Tag Manager",
    desc: "Load tags through a GTM container",
    icon: "TagsOutlined",
    fields: [{ key: "containerId", label: "Container ID", placeholder: "GTM-XXXXXXX" }],
  },
  {
    key: "posthog",
    label: "PostHog",
    desc: "Product analytics & session replay",
    icon: "FundOutlined",
    fields: [
      { key: "apiKey", label: "Project API Key", placeholder: "phc_xxxxxxxxxxxxxxxxxx" },
      { key: "apiHost", label: "API Host", placeholder: "https://us.i.posthog.com" },
    ],
  },
  {
    key: "metaPixel",
    label: "Meta Pixel",
    desc: "Conversion tracking for Meta ads",
    icon: "FacebookOutlined",
    fields: [{ key: "pixelId", label: "Pixel ID", placeholder: "000000000000000" }],
  },
  {
    key: "hotjar",
    label: "Hotjar",
    desc: "Heatmaps & session recordings",
    icon: "FireOutlined",
    fields: [{ key: "siteId", label: "Site ID (hjid)", placeholder: "0000000" }],
  },
  {
    key: "linkedin",
    label: "LinkedIn Insight Tag",
    desc: "B2B conversion tracking",
    icon: "LinkedinOutlined",
    fields: [{ key: "partnerId", label: "Partner ID", placeholder: "0000000" }],
  },
];

async function apiFetch(path, options = {}) {
  const res = await fetch(`/api/${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function getIcon(name) {
  const Icon = AntIcons[name];
  return Icon ? <Icon /> : null;
}

export function IntegrationsSettings() {
  const [integrations, setIntegrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiFetch("settings");
      setIntegrations(data?.integrations || {});
    } catch {
      // No settings yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setProvider(pkey, patch) {
    setIntegrations((prev) => ({
      ...prev,
      [pkey]: { ...(prev[pkey] || {}), ...patch },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const { data } = await apiFetch("settings", {
        method: "PATCH",
        body: JSON.stringify({ integrations }),
      });
      setIntegrations(data?.integrations || {});
      message.success("Integrations saved");
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spin style={{ display: "block", margin: "48px auto" }} />;

  return (
    <div style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            External Integrations
          </Title>
          <Text type="secondary">
            Connect analytics and marketing tools. Credentials are saved to your site
            settings and injected on public pages only — never in the admin.
          </Text>
        </div>
        <Button type="primary" icon={<AntIcons.CheckOutlined />} loading={saving} onClick={save}>
          Save changes
        </Button>
      </div>

      {PROVIDERS.map((p) => {
        const conf = integrations[p.key] || {};
        const ready = !!conf[p.fields[0].key];
        return (
          <Card
            key={p.key}
            style={{ marginBottom: 16 }}
            styles={{
              header: { padding: "14px 20px", minHeight: "auto" },
              body: { padding: conf.enabled ? "16px 20px 20px" : 0 },
            }}
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: conf.enabled ? 1 : 0.65 }}>
                <span style={{ fontSize: 18, display: "inline-flex" }}>{getIcon(p.icon)}</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{p.label}</div>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                    {p.desc}
                  </Text>
                </div>
              </div>
            }
            extra={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {conf.enabled &&
                  (ready ? (
                    <Tag color="success" style={{ marginInlineEnd: 0 }}>
                      Connected
                    </Tag>
                  ) : (
                    <Tag color="warning" style={{ marginInlineEnd: 0 }}>
                      Add ID
                    </Tag>
                  ))}
                <Switch
                  checked={conf.enabled ?? false}
                  onChange={(checked) => setProvider(p.key, { enabled: checked })}
                />
              </div>
            }
          >
            {conf.enabled && (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {p.fields.map((f) => (
                  <div key={f.key} style={{ flex: "1 1 240px", minWidth: 200 }}>
                    <Text style={{ fontSize: 12, display: "block", marginBottom: 6 }} type="secondary">
                      {f.label}
                    </Text>
                    <Input
                      value={conf[f.key] || ""}
                      placeholder={f.placeholder}
                      onChange={(e) => setProvider(p.key, { [f.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      <Card
        styles={{ header: { padding: "14px 20px", minHeight: "auto" }, body: { padding: "16px 20px 20px" } }}
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18, display: "inline-flex" }}>
              <AntIcons.CodeOutlined />
            </span>
            <div>
              <div style={{ fontWeight: 500 }}>Custom Code</div>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                Raw HTML / scripts injected near the top of your public pages (inside &lt;body&gt;).
              </Text>
            </div>
          </div>
        }
      >
        <div>
          <Text style={{ fontSize: 12, display: "block", marginBottom: 6 }} type="secondary">
            Custom HTML
          </Text>
          <TextArea
            rows={5}
            value={integrations.customHtml ?? integrations.customHeadHtml ?? ""}
            placeholder="<!-- e.g. third-party widget snippet, custom <script> -->"
            onChange={(e) =>
              setIntegrations((prev) => ({ ...prev, customHtml: e.target.value }))
            }
          />
        </div>
      </Card>
    </div>
  );
}
