import { McpAdminPage } from "./admin/McpAdminPage.jsx";

export function mcpPlugin(options = {}) {
  return {
    name: "mcp",
    version: "1.0.0",

    adminPages: [
      {
        key: "mcp",
        label: "MCP Settings",
        icon: "ApiOutlined",
        path: "/admin/mcp",
        component: McpAdminPage,
      },
    ],
  };
}
