import { and, eq, gt } from "drizzle-orm";

import { auth, MCP_API_KEY_CONFIG_ID } from "@/lib/auth";
import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { defaultMcpPermission, extractBearerToken, isMcpToken, type McpPermission } from "@/lib/mcp-auth-rules";

export async function resolveMcpApiKeyUserId(token: string, permission: McpPermission): Promise<string | null> {
  if (!isMcpToken(token)) return null;

  try {
    const result = await auth.api.verifyApiKey({
      body: {
        configId: MCP_API_KEY_CONFIG_ID,
        key: token,
        permissions: { mcp: [permission] },
      },
    });
    return result.valid ? result.key?.referenceId ?? null : null;
  } catch {
    return null;
  }
}

export async function resolveUserId(request: Request, options: { mcpPermission?: McpPermission } = {}) {
  const bearerToken = extractBearerToken(request);
  const mcpPermission = options.mcpPermission ?? defaultMcpPermission(request.method);

  if (isMcpToken(bearerToken)) {
    return mcpPermission ? resolveMcpApiKeyUserId(bearerToken, mcpPermission) : null;
  }

  // First, try legacy session resolution (for MCP/CLI/Telegram backward compat)
  const sessionToken = bearerToken ?? request.headers.get("x-session-token");

  if (sessionToken) {
    const session = await db.query.sessions.findFirst({
      where: and(eq(sessions.token, sessionToken), gt(sessions.expiresAt, new Date())),
      columns: { userId: true },
    });

    if (session) {
      return session.userId;
    }
  }

  // Fallback: Check Better Auth session via cookie (for web PWA)
  try {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const baSession = await auth.api.getSession({
        headers: new Headers({ cookie: cookieHeader }),
      });
      if (baSession?.user?.id) {
        return baSession.user.id;
      }
    }
  } catch {
    // Better Auth session lookup failed, continue to return null
  }

  return null;
}

export async function getSessionUser(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return null;
  }

  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}
