"use client";

import * as AntIcons from "@ant-design/icons";
import { Layout, Menu, theme } from "antd";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { designTokens } from "../../theme/tokens";

const { Sider } = Layout;

function getIcon(iconName) {
  const Icon = AntIcons[iconName];
  return Icon ? <Icon /> : null;
}

function buildMenuItems(sidebarItems, contentTypes) {
  return sidebarItems.map((item) => {
    // Replace static "Content" children with dynamic content types
    if (item.key === "content-nav") {
      const dynamicChildren = contentTypes.map((ct) => ({
        key: `/admin/content?type=${ct._id}`,
        label: <Link href={`/admin/content?type=${ct._id}`}>{ct.name}</Link>,
      }));
      return {
        key: item.key,
        icon: getIcon(item.icon),
        label: item.label,
        children: [
          // "All content" link
          {
            key: "/admin/content",
            label: <Link href="/admin/content">All content</Link>,
          },
          ...dynamicChildren,
        ],
      };
    }

    if (item.children) {
      return {
        key: item.key,
        icon: getIcon(item.icon),
        label: item.label,
        children: item.children.map((child) => ({
          key: child.key,
          label: <Link href={child.path}>{child.label}</Link>,
        })),
      };
    }
    return {
      key: item.key,
      icon: getIcon(item.icon),
      label: <Link href={item.path}>{item.label}</Link>,
    };
  });
}

export function AdminSidebar({ sidebarItems = [], title = "CMS" }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token } = theme.useToken();
  const [contentTypes, setContentTypes] = useState([]);

  const fetchContentTypes = useCallback(async () => {
    try {
      const res = await fetch("/api/content-types");
      const json = await res.json();
      if (res.ok) setContentTypes(json.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchContentTypes();
  }, [fetchContentTypes]);

  const menuItems = buildMenuItems(sidebarItems, contentTypes);

  // Build selected key — if on /admin/content with ?type= param, use full path+query
  const typeParam = searchParams.get("type");
  const selectedKey =
    pathname === "/admin/content" && typeParam
      ? `/admin/content?type=${typeParam}`
      : pathname;

  return (
    <Sider
      breakpoint="lg"
      collapsedWidth={64}
      theme="dark"
      width={232}
      style={{ fontFamily: designTokens.fontSans, borderRight: `1px solid ${token.colorBorderSecondary}` }}
    >
      <div
        style={{
          padding: `${token.paddingSM}px ${token.padding}px ${token.paddingXS}px`,
          color: token.colorText,
          fontWeight: 600,
          fontSize: token.fontSize,
          letterSpacing: "0.02em",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          height: "55px",
        }}
      >
        {title}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={["content-nav"]}
        style={{ borderInlineEnd: "none", fontFamily: designTokens.fontSans }}
        items={menuItems}
      />
    </Sider>
  );
}
