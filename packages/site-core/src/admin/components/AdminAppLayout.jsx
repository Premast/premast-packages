"use client";

import { Layout, theme } from "antd";
import { AdminSidebar } from "./AdminSidebar.jsx";

const { Header, Content } = Layout;

export function AdminAppLayout({ children, sidebarItems = [], title = "CMS", fontFamily }) {
  const { token } = theme.useToken();
  const headerHeight = token.controlHeight * 2;

  return (
    <Layout style={{ minHeight: "100vh" }} hasSider>
      <AdminSidebar sidebarItems={sidebarItems} title={title} fontFamily={fontFamily} />
      <Layout>
        <Header
          style={{
            margin: 0,
            height: headerHeight,
            lineHeight: `${headerHeight}px`,
            paddingInline: token.paddingLG,
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            fontSize: token.fontSize,
            fontWeight: 500,
            color: token.colorText,
            fontFamily: fontFamily || "inherit",
          }}
        >
          Admin
        </Header>
        <Content
          style={{
            margin: 0,
            padding: 0,
            minHeight: 280,
            background: token.colorBgLayout ?? token.colorBgBase,
            color: token.colorText,
            fontFamily: fontFamily || "inherit",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
