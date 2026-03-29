#!/usr/bin/env node

import { startMcpServer } from "../src/mcp-server.js";

startMcpServer().catch((err) => {
  console.error("[premast-mcp] Fatal error:", err.message);
  process.exit(1);
});
