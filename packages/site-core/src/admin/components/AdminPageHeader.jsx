"use client";

import { Flex, Typography } from "antd";

const { Text } = Typography;

/**
 * The standard admin page toolbar: a fixed-height bar with the page name
 * on the left and actions on the right, sitting flush above the page body.
 *
 * The admin `Content` is rendered with `padding: 0` so this bar can span
 * the full width; page bodies supply their own padding (24 is the house
 * value — see `AdminPageBody`).
 *
 * Every list view had this markup inline and byte-identical, so a page
 * that forgot it (or its body padding) sat flush against the window edge
 * and looked broken next to the others.
 */
export function AdminPageHeader({ title, description, children }) {
  return (
    <Flex
      align="center"
      justify="space-between"
      gap={16}
      style={{
        minHeight: 56,
        padding: "0 24px",
        borderBottom:
          "1px solid var(--ant-color-border-secondary, rgba(255,255,255,0.06))",
        background: "var(--ant-color-bg-container, #141414)",
        flexShrink: 0,
      }}
    >
      <Flex vertical justify="center" style={{ minWidth: 0, padding: "8px 0" }}>
        <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>
          {title}
        </span>
        {description ? (
          <Text
            type="secondary"
            style={{ fontSize: 12, lineHeight: 1.4 }}
            ellipsis={{ tooltip: description }}
          >
            {description}
          </Text>
        ) : null}
      </Flex>
      {children ? (
        <Flex gap={8} align="center" style={{ flexShrink: 0 }}>
          {children}
        </Flex>
      ) : null}
    </Flex>
  );
}

/** The padded body that pairs with `AdminPageHeader`. */
export function AdminPageBody({ children, style }) {
  return <div style={{ padding: 24, ...style }}>{children}</div>;
}
