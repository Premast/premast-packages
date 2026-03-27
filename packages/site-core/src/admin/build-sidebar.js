const CORE_SIDEBAR_ITEMS = [
  { key: "/admin", icon: "AppstoreOutlined", label: "Dashboard", path: "/admin" },
  { key: "/admin/pages", icon: "FileOutlined", label: "Pages", path: "/admin/pages" },
  { key: "/admin/global", icon: "GlobalOutlined", label: "Global", path: "/admin/global" },
  { key: "/admin/templates", icon: "BlockOutlined", label: "Templates", path: "/admin/templates" },
  {
    key: "content-nav",
    icon: "FolderOutlined",
    label: "Content",
    children: [{ key: "/admin/content", label: "All content", path: "/admin/content" }],
  },
  { key: "/admin/settings", icon: "SettingOutlined", label: "Settings", path: "/admin/settings", requiredRole: "super_admin" },
  { key: "/admin/users", icon: "TeamOutlined", label: "Users", path: "/admin/users", requiredRole: "super_admin" },
];

export function buildAdminSidebarItems(plugins) {
  const items = [...CORE_SIDEBAR_ITEMS];
  for (const plugin of plugins) {
    if (!plugin.adminPages) continue;
    for (const page of plugin.adminPages) {
      items.push({
        key: page.path || `/admin/${page.key}`,
        icon: page.icon || "AppstoreOutlined",
        label: page.label,
        path: page.path || `/admin/${page.key}`,
        pluginComponent: page.component,
      });
    }
  }
  return items;
}
