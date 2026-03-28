import { Suspense } from "react";
import { AdminPageEditor } from "./components/pages/AdminPageEditor.jsx";
import { AdminGlobalEditor } from "./components/global/AdminGlobalEditor.jsx";
import { AdminTemplateEditor } from "./components/templates/AdminTemplateEditor.jsx";
import { AdminContentEditor } from "./components/content/AdminContentEditor.jsx";

/**
 * Dynamic admin routes with URL params.
 * Each entry: regex pattern, component, param extraction function.
 */
const DYNAMIC_ROUTES = [
  {
    pattern: /^\/admin\/pages\/(.+)$/,
    Component: AdminPageEditor,
    extractProps: (match) => ({ pageId: match[1] }),
  },
  {
    pattern: /^\/admin\/global\/(.+)$/,
    Component: AdminGlobalEditor,
    extractProps: (match) => ({ globalKey: match[1] }),
  },
  {
    pattern: /^\/admin\/templates\/(.+)$/,
    Component: AdminTemplateEditor,
    extractProps: (match) => ({ templateId: match[1] }),
  },
  {
    pattern: /^\/admin\/content\/(.+)$/,
    Component: AdminContentEditor,
    extractProps: (match) => ({ contentId: match[1] }),
  },
];

/**
 * Resolve an admin pathname to a component + props.
 *
 * Checks:
 * 1. Static routes registered in siteConfig.adminSidebarItems (core + plugin pages)
 * 2. Dynamic routes with URL params (editors)
 *
 * @param {string} pathname - e.g. "/admin/pages" or "/admin/pages/abc123"
 * @param {object} siteConfig - from createSiteConfig()
 * @returns {{ Component, props, wrapSuspense? } | null}
 */
export function resolveAdminPage(pathname, siteConfig) {
  // 1. Static match from sidebar items (both core and plugin pages)
  // Flatten: some items have children (e.g. content-nav group)
  const allItems = siteConfig.adminSidebarItems.flatMap(
    (i) => (i.children ? [i, ...i.children] : [i])
  );
  const item = allItems.find(
    (i) => i.path === pathname && i.component
  );
  if (item) {
    return {
      Component: item.component,
      props: {},
      wrapSuspense: item.wrapSuspense,
    };
  }

  // 2. Dynamic route match
  for (const route of DYNAMIC_ROUTES) {
    const match = pathname.match(route.pattern);
    if (match) {
      return {
        Component: route.Component,
        props: route.extractProps(match),
      };
    }
  }

  return null;
}
