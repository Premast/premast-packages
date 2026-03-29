import mongoose from "mongoose";
import { z } from "zod";

function requireAuth(session) {
  if (!session) {
    throw new Error("Authentication required. Provide MCP_TOKEN in environment.");
  }
}

export function registerInstructionTools(server) {
  server.tool(
    "get_instructions",
    "Get all active design instructions, brand guidelines, and content rules. IMPORTANT: Always call this before creating or updating pages, content, or templates to ensure your work follows the site's guidelines.",
    {
      category: z
        .enum(["brand", "design", "content", "seo", "general", "all"])
        .optional()
        .describe("Filter by category. Default: all"),
    },
    async ({ category }) => {
      requireAuth(server._mcpSession);

      const McpInstruction = mongoose.models.McpInstruction;
      if (!McpInstruction) {
        return {
          content: [
            {
              type: "text",
              text: "No instructions configured. Proceed with your best judgment.",
            },
          ],
        };
      }

      const filter = { enabled: true };
      if (category && category !== "all") {
        filter.category = category;
      }

      const instructions = await McpInstruction.find(filter)
        .sort({ order: 1, createdAt: 1 })
        .lean();

      if (instructions.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No active instructions found. Proceed with your best judgment.",
            },
          ],
        };
      }

      // Format instructions grouped by category
      const grouped = {};
      for (const inst of instructions) {
        if (!grouped[inst.category]) grouped[inst.category] = [];
        grouped[inst.category].push(inst);
      }

      let output = "# Site Instructions & Guidelines\n\n";
      output +=
        "Follow these instructions when creating or editing content:\n\n";

      for (const [cat, items] of Object.entries(grouped)) {
        const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
        output += `## ${catLabel}\n\n`;
        for (const item of items) {
          output += `### ${item.title}\n${item.content}\n\n`;
        }
      }

      return {
        content: [{ type: "text", text: output.trim() }],
      };
    },
  );
}
