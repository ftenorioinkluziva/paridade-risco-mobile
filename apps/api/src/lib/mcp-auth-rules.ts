export type McpPermission = "read" | "sync" | "mapping";

export const MCP_TOKEN_PREFIX = "pr_mcp_";

export function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

export function isMcpToken(token: string | null): token is string {
  return Boolean(token?.startsWith(MCP_TOKEN_PREFIX));
}

export function defaultMcpPermission(method: string): McpPermission | undefined {
  return ["GET", "HEAD"].includes(method.toUpperCase()) ? "read" : undefined;
}
