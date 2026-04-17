import { DashboardPage } from "./components/DashboardPage.jsx";
import { AdminPagesView } from "./components/pages/AdminPagesView.jsx";
import { AdminGlobalView } from "./components/global/AdminGlobalView.jsx";
import { AdminTemplatesView } from "./components/templates/AdminTemplatesView.jsx";
import { AdminContentView } from "./components/content/AdminContentView.jsx";
import { AdminRedirectsView } from "./components/redirects/AdminRedirectsView.jsx";
import { SettingsPage } from "./components/SettingsPage.jsx";
import { UsersPage } from "./components/users/UsersPage.jsx";

const CORE_SIDEBAR_ITEMS = [
  { key: "/admin", icon: "AppstoreOutlined", label: "Dashboard", path: "/admin", component: DashboardPage },
  { key: "/admin/pages", icon: "FileOutlined", label: "Pages", path: "/admin/pages", component: AdminPagesView },
  { key: "/admin/global", icon: "GlobalOutlined", label: "Global", path: "/admin/global", component: AdminGlobalView },
  { key: "/admin/templates", icon: "BlockOutlined", label: "Templates", path: "/admin/templates", component: AdminTemplatesView },
  {
    key: "content-nav",
    icon: "FolderOutlined",
    label: "Content",
    children: [{ key: "/admin/content", label: "All content", path: "/admin/content", component: AdminContentView, wrapSuspense: true }],
  },
  { key: "/admin/redirects", icon: "SwapOutlined", label: "Redirects", path: "/admin/redirects", component: AdminRedirectsView },
  { key: "/admin/settings", icon: "SettingOutlined", label: "Settings", path: "/admin/settings", requiredRole: "super_admin", component: SettingsPage },
  { key: "/admin/users", icon: "TeamOutlined", label: "Users", path: "/admin/users", requiredRole: "super_admin", component: UsersPage },
];

/** Deep-copy sidebar items while preserving component references. */
function cloneItems(items) {
  return items.map((item) => {
    const copy = { ...item };
    if (item.children) {
      copy.children = item.children.map((c) => ({ ...c }));
    }
    return copy;
  });
}

export function buildAdminSidebarItems(plugins) {
  const items = cloneItems(CORE_SIDEBAR_ITEMS);
  for (const plugin of plugins) {
    if (!plugin.adminPages) continue;
    for (const page of plugin.adminPages) {
      items.push({
        key: page.path || `/admin/${page.key}`,
        icon: page.icon || "AppstoreOutlined",
        label: page.label,
        path: page.path || `/admin/${page.key}`,
        component: page.component,
      });
    }
  }
  return items;
}
