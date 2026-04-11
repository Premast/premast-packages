"use client";

import { useMemo } from "react";
import { Select, Space, Typography } from "antd";
import { GlobalOutlined } from "@ant-design/icons";
import { buildLocaleOptions } from "../config.js";

/**
 * Dropdown control for the admin toolbar. Lets editors switch which
 * locale of a page they are editing.
 *
 * Stateless — the parent owns `value` and `onChange`. This keeps it
 * trivial to wire into admin layouts that persist the active locale
 * in URL params, cookies, or a Zustand store.
 */
export function LocaleSwitcher({
  value,
  onChange,
  locales = [],
  localeMeta = {},
  size = "middle",
  showLabel = true,
  style = {},
}) {
  const options = useMemo(
    () => buildLocaleOptions(locales, localeMeta),
    [locales, localeMeta],
  );

  return (
    <Space size={8} style={style}>
      {showLabel ? (
        <Typography.Text type="secondary">
          <GlobalOutlined /> Language
        </Typography.Text>
      ) : null}
      <Select
        size={size}
        value={value}
        options={options}
        onChange={onChange}
        style={{ minWidth: 160 }}
      />
    </Space>
  );
}
