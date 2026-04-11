"use client";

import { GlobalOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Empty,
  Flex,
  Select,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const { Text } = Typography;

export function AdminGlobalView() {
  const router = useRouter();
  const [globals, setGlobals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Locale-aware filter. "all" lists every Global record including
  // legacy ones with locale=null. Specific locales narrow the list.
  const [localeFilter, setLocaleFilter] = useState("all");
  const [availableLocales, setAvailableLocales] = useState([]);

  const fetchGlobals = useCallback(async () => {
    setLoading(true);
    try {
      const url = localeFilter === "all"
        ? "/api/globals"
        : `/api/globals?locale=${encodeURIComponent(localeFilter)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load globals");
      setGlobals(json.data ?? []);
    } catch (e) {
      message.error(e.message);
      setGlobals([]);
    } finally {
      setLoading(false);
    }
  }, [localeFilter]);

  useEffect(() => {
    fetchGlobals();
  }, [fetchGlobals]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/i18n/locales");
        if (!res.ok) return;
        const json = await res.json();
        if (active) setAvailableLocales(json.locales ?? []);
      } catch { /* i18n plugin not installed */ }
    })();
    return () => { active = false; };
  }, []);

  // Edit a specific (key, locale) sibling. The route encodes the
  // locale so AdminGlobalEditor can load the correct document.
  // Legacy globals with locale=null get the slug "default" so the
  // URL never contains a literal null.
  const openEdit = (record) => {
    const localeSeg = record.locale ?? "default";
    router.push(`/admin/global/${record.key}/${localeSeg}`);
  };

  const handleTogglePublished = async (record, published) => {
    try {
      const res = await fetch(`/api/globals/${record.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published, locale: record.locale ?? null }),
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
    // Language column — only when the i18n plugin is active.
    ...(availableLocales.length > 0
      ? [{
          title: "Language",
          dataIndex: "locale",
          key: "locale",
          width: 110,
          render: (locale) =>
            locale ? (
              <Tag color="blue" style={{ textTransform: "uppercase" }}>
                {locale}
              </Tag>
            ) : (
              <Tag>—</Tag>
            ),
        }]
      : []),
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
            onChange={(checked) => handleTogglePublished(record, checked)}
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
            openEdit(record);
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
        <Flex gap={8} align="center">
          {availableLocales.length > 0 && (
            <Select
              size="small"
              value={localeFilter}
              onChange={setLocaleFilter}
              style={{ minWidth: 130 }}
              suffixIcon={<GlobalOutlined />}
              options={[
                { label: "All languages", value: "all" },
                ...availableLocales.map((code) => ({
                  label: code.toUpperCase(),
                  value: code,
                })),
              ]}
            />
          )}
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchGlobals}>
            Refresh
          </Button>
        </Flex>
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
            // Compound rowKey: (key, locale) — one header per locale
            // means multiple rows share the same `key`. Before this,
            // React warned "Warning: Each child in a list should have
            // a unique 'key' prop." because rowKey was just "key".
            rowKey={(record) => `${record.key}:${record.locale ?? "default"}`}
            columns={columns}
            dataSource={globals}
            pagination={false}
            onRow={(record) => ({
              onClick: () => openEdit(record),
              style: { cursor: "pointer" },
            })}
          />
        )}
      </Spin>
      </div>
    </div>
  );
}
