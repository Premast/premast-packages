import { McpAdminPage } from "./admin/McpAdminPage.jsx";
import { CustomBlock } from "./blocks/CustomBlock.jsx";

export function mcpPlugin(options = {}) {
  return {
    name: "mcp",
    version: "1.0.0",

    blocks: {
      CustomBlock,
    },

    categories: {
      "mcp-custom": {
        title: "Custom",
        components: ["CustomBlock"],
        defaultExpanded: false,
      },
    },

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
