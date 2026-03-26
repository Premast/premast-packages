"use client";

import * as AntIcons from "@ant-design/icons";
import { Layout, Menu, theme } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

const { Sider } = Layout;

function getIcon(iconName) {
  const Icon = AntIcons[iconName];
  return Icon ? <Icon /> : null;
}

function buildMenuItems(sidebarItems) {
  return sidebarItems.map((item) => {
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

export function AdminSidebar({ sidebarItems = [], title = "CMS", fontFamily }) {
  const pathname = usePathname();
  const { token } = theme.useToken();
  const menuItems = buildMenuItems(sidebarItems);

  return (
    <Sider
      breakpoint="lg"
      collapsedWidth={64}
      theme="dark"
      width={232}
      style={{ fontFamily: fontFamily || "inherit", borderRight: `1px solid ${token.colorBorderSecondary}` }}
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
        selectedKeys={[pathname]}
        defaultOpenKeys={["content-nav"]}
        style={{ borderInlineEnd: "none", fontFamily: fontFamily || "inherit" }}
        items={menuItems}
      />
    </Sider>
  );
}
