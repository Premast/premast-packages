"use client";

import { Layout, theme } from "antd";
import { designTokens } from "../../theme/tokens";
import { AdminSidebar } from "./AdminSidebar";

const { Header, Content } = Layout;

export function AdminAppLayout({ children, sidebarItems = [], title = "CMS" }) {
  const { token } = theme.useToken();
  const headerHeight = token.controlHeight * 2;

  return (
    <Layout style={{ minHeight: "100vh" }} hasSider>
      <AdminSidebar sidebarItems={sidebarItems} title={title} />
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
            fontFamily: designTokens.fontSans,
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
            fontFamily: designTokens.fontSans,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
