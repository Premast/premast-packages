import crypto from "crypto";
import mongoose from "mongoose";

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Validate MCP_TOKEN against the McpToken collection.
 * Returns the token document or null.
 */
export async function validateMcpToken(rawToken) {
  if (!rawToken) return null;
  const hash = hashToken(rawToken);
  const McpToken = mongoose.models.McpToken;
  if (!McpToken) return null;

  const token = await McpToken.findOne({ tokenHash: hash, revoked: false });
  if (!token) return null;

  // Update lastUsedAt (fire-and-forget)
  McpToken.updateOne({ _id: token._id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});

  return token;
}

export function registerAuthTools(server) {
  server.tool(
    "whoami",
    "Check if authenticated and show current token info",
    {},
    async () => {
      const token = server._mcpSession;
      if (!token) {
        return {
          content: [{ type: "text", text: "Not authenticated. Provide MCP_TOKEN in environment." }],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                authenticated: true,
                tokenName: token.name,
                userId: token.userId.toString(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
