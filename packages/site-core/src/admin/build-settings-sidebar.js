import { SettingsPage } from "./components/SettingsPage.jsx";
import { IntegrationsSettings } from "./components/settings/IntegrationsSettings.jsx";

/**
 * Items for the dedicated Settings section sidebar. This sidebar replaces the
 * main CMS sidebar for all `/admin/settings/*` routes (see AdminAppLayout) and
 * offers a "Back to CMS" link out of the section.
 *
 * Same item shape as the main sidebar (key/icon/label/path/component), so it
 * works with both AdminSidebar (menu) and resolveAdminPage (routing). Icons are
 * Ant Design icon names.
 */
const CORE_SETTINGS_ITEMS = [
  { key: "/admin/settings", icon: "ControlOutlined", label: "General", path: "/admin/settings", requiredRole: "super_admin", component: SettingsPage },
  { key: "/admin/settings/integrations", icon: "ApiOutlined", label: "External Integrations", path: "/admin/settings/integrations", requiredRole: "super_admin", component: IntegrationsSettings },
];

/** Deep-copy items while preserving component references. */
function cloneItems(items) {
  return items.map((item) => ({ ...item }));
}

/**
 * Build the settings sidebar items (core + any plugin-contributed pages).
 * Plugins may add settings sub-pages via a `settingsPages` array, mirroring the
 * `adminPages` convention used by the main sidebar.
 */
export function buildSettingsSidebarItems(plugins = []) {
  const items = cloneItems(CORE_SETTINGS_ITEMS);
  for (const plugin of plugins) {
    if (!plugin.settingsPages) continue;
    for (const page of plugin.settingsPages) {
      items.push({
        key: page.path || `/admin/settings/${page.key}`,
        icon: page.icon || "AppstoreOutlined",
        label: page.label,
        path: page.path || `/admin/settings/${page.key}`,
        requiredRole: page.requiredRole,
        component: page.component,
      });
    }
  }
  return items;
}

export { CORE_SETTINGS_ITEMS };
