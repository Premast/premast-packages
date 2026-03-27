"use client";

import { Segmented } from "antd";

export function SearchIndexingField({ value, onChange }) {
  return (
    <Segmented
      block
      value={value || "false"}
      onChange={onChange}
      options={[
        { label: "Index", value: "false" },
        { label: "No Index", value: "true" },
      ]}
    />
  );
}
