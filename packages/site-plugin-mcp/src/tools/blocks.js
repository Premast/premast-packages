export function registerBlockTools(server, getBlocks) {
  server.tool(
    "list_blocks",
    "List all available Puck blocks with their fields, field types, options, and default props. Use this to understand what blocks you can use when designing pages.",
    {},
    async () => {
      const { blocks, categories, rootFields } = await getBlocks();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ blocks, categories, rootFields }, null, 2),
          },
        ],
      };
    },
  );
}
