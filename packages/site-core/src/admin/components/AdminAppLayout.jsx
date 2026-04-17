"use client";

import { ConfigProvider, Layout, theme as antdTheme } from "antd";
import { Suspense, useMemo } from "react";
import { AdminSidebar } from "./AdminSidebar.jsx";
import { AdminErrorBoundary } from "./AdminErrorBoundary.jsx";
import { defaultAdminTokens } from "../admin-theme.js";
import { useOptionalSession } from "../../auth/useSession.js";

const { Content } = Layout;

/**
 * Build the Ant Design theme config from admin tokens.
 * This runs inside the client component so it uses the client's antd instance,
 * avoiding dual-context issues with symlinked packages.
 */
function buildThemeFromTokens(tokens) {
  const t = tokens;
  return {
    algorithm: [antdTheme.darkAlgorithm, antdTheme.compactAlgorithm],
    token: {
      colorPrimary: t.accent,
      colorBgBase: t.bg,
      colorBgContainer: t.surface,
      colorBgElevated: t.surfaceRaised,
      colorBgLayout: t.bg,
      colorBorder: t.border,
      colorBorderSecondary: t.borderSecondary,
      colorText: t.text,
      colorTextSecondary: t.textMuted,
      borderRadius: 5,
      fontSize: 13,
      fontFamily: t.fontSans,
      controlHeight: 28,
      controlHeightSM: 22,
      controlHeightLG: 36,
      padding: 12,
      paddingSM: 8,
      paddingLG: 16,
      paddingContentHorizontal: 12,
      paddingContentVertical: 6,
      marginXS: 6,
      marginSM: 10,
      margin: 14,
    },
    components: {
      Layout: {
        bodyBg: t.bg,
        headerBg: t.surface,
        footerBg: t.bgSubtle,
        siderBg: t.surface,
        triggerBg: t.bgSubtle,
      },
      Menu: {
        darkItemBg: t.surface,
        darkSubMenuItemBg: t.bgSubtle,
        darkPopupBg: t.surface,
        darkItemColor: t.navItemInactive,
        darkItemHoverBg: t.fill,
        darkItemHoverColor: t.text,
        darkGroupTitleColor: t.navItemInactive,
        darkItemSelectedBg: t.accent,
        darkItemSelectedColor: t.accentOnAccent,
        itemBorderRadius: 6,
      },
      Button: {
        borderRadius: t.buttonRadius,
        fontWeight: 500,
        primaryShadow: "none",
        defaultShadow: "none",
        dangerShadow: "none",
        primaryColor: t.accentOnAccent,
        defaultColor: t.text,
        defaultBg: t.surface,
        defaultBorderColor: t.border,
        defaultHoverBg: t.fill,
        defaultHoverColor: t.text,
        defaultHoverBorderColor: t.borderStrong,
        defaultActiveBg: t.surfaceRaised,
        defaultActiveColor: t.text,
        defaultActiveBorderColor: t.accent,
        textTextColor: t.textMuted,
        textTextHoverColor: t.text,
        textTextActiveColor: t.text,
        textHoverBg: t.fill,
        defaultGhostColor: t.text,
        defaultGhostBorderColor: t.borderStrong,
      },
    },
  };
}

function AdminAppLayoutInner({ children, sidebarItems, title }) {
  const { token } = antdTheme.useToken();
  const headerHeight = token.controlHeight * 2;
  const session = useOptionalSession();

  return (
    <Layout style={{ minHeight: "100vh" }} hasSider>
      <Suspense>
        <AdminSidebar sidebarItems={sidebarItems} title={title} session={session} />
      </Suspense>
      <Layout>
        <Content
          style={{
            margin: 0,
            padding: 0,
            minHeight: "100vh",
            background: token.colorBgLayout ?? token.colorBgBase,
            color: token.colorText,
            fontFamily: token.fontFamily,
          }}
        >
          <AdminErrorBoundary>
            {children}
          </AdminErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  );
}

export function AdminAppLayout({ children, sidebarItems = [], title = "CMS", adminTokens }) {
  const tokens = useMemo(
    () => ({ ...defaultAdminTokens, ...adminTokens }),
    [adminTokens],
  );
  const themeConfig = useMemo(() => buildThemeFromTokens(tokens), [tokens]);

  return (
    <ConfigProvider theme={themeConfig}>
      <AdminAppLayoutInner sidebarItems={sidebarItems} title={title}>
        {children}
      </AdminAppLayoutInner>
    </ConfigProvider>
  );
}
