"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Select, Space, Typography, message } from "antd";
import { AppstoreAddOutlined, EditOutlined, ReloadOutlined } from "@ant-design/icons";

const { Text } = Typography;

/**
 * Puck custom field for `{ type: "symbol" }`. Stores a plain component
 * (Symbol) id string — same value shape as `{ type: "text" }`, so a
 * block field can be swapped to/from it without breaking saved data.
 *
 * Lists existing components from `/api/symbols` in a Select. A "Manage"
 * button links to the Components admin page.
 */
export function SymbolPickerField({ value, onChange, name, field }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const reqSeq = useRef(0);
  const label = field?.label || name;

  const fetchSymbols = async () => {
    setLoading(true);
    const seq = ++reqSeq.current;
    try {
      const res = await fetch("/api/symbols?published=true");
      const json = await res.json();
      if (seq !== reqSeq.current) return;
      if (!res.ok) throw new Error(json.error || "Failed to load components");
      setOptions(
        (json.data || []).map((s) => ({ label: s.name, value: s._id })),
      );
    } catch (e) {
      message.error(e.message);
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSymbols();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {label && (
        <div style={{ fontSize: 12, color: "var(--puck-color-grey-05, #6b7280)", marginBottom: 6 }}>
          {label}
        </div>
      )}
      <Space.Compact style={{ width: "100%" }}>
        <Select
          size="small"
          style={{ width: "100%" }}
          value={value || undefined}
          options={options}
          loading={loading}
          placeholder="Select a component…"
          onChange={(v) => onChange(v)}
          allowClear
          onClear={() => onChange("")}
          notFoundContent={
            loading ? null : <Text type="secondary">No published components yet</Text>
          }
        />
        <Button size="small" icon={<ReloadOutlined />} onClick={fetchSymbols} title="Refresh" />
      </Space.Compact>
      <div style={{ marginTop: 6 }}>
        <Button
          size="small"
          type="link"
          icon={value ? <EditOutlined /> : <AppstoreAddOutlined />}
          href={value ? `/admin/components?id=${value}` : "/admin/components"}
          style={{ padding: 0, height: "auto", fontSize: 12 }}
        >
          {value ? "Edit this component" : "Create / manage components"}
        </Button>
      </div>
    </div>
  );
}
