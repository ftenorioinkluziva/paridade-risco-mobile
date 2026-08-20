import { and, eq, gt } from "drizzle-orm";

import { auth, MCP_API_KEY_CONFIG_ID } from "@/lib/auth";
import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { defaultMcpPermission, extractBearerToken, isMcpToken, type McpPermission } from "@/lib/mcp-auth-rules";

export type McpApiKeyFailureReason = "missing" | "invalid" | "expired" | "revoked" | "insufficient_scope";

export type McpApiKeyVerification =
  | { valid: true; userId: string; keyId: string; expiresAt: string | null; permissions: McpPermission[] }
  | { valid: false; reason: McpApiKeyFailureReason };

export async function verifyMcpApiKey(token: string | null, permission?: McpPermission): Promise<McpApiKeyVerification> {
  if (!token) return { valid: false, reason: "missing" };
  if (!isMcpToken(token)) return { valid: false, reason: "invalid" };

  try {
    const result = await auth.api.verifyApiKey({
      body: { configId: MCP_API_KEY_CONFIG_ID, key: token },
    });
    if (!result.valid || !result.key?.referenceId) {
      const code = result.error?.code;
      if (code === "KEY_EXPIRED") return { valid: false, reason: "expired" };
      if (code === "KEY_DISABLED") return { valid: false, reason: "revoked" };
      return { valid: false, reason: "invalid" };
    }

    const rawPermissions = result.key.permissions as Record<string, unknown> | null | undefined;
    const permissions = Array.isArray(rawPermissions?.mcp)
      ? rawPermissions.mcp.filter((value): value is McpPermission => ["read", "sync", "mapping"].includes(String(value)))
      : [];
    if (permission && !permissions.includes(permission)) {
      return { valid: false, reason: "insufficient_scope" };
    }

    return {
      valid: true,
      userId: result.key.referenceId,
      keyId: result.key.id,
      expiresAt: result.key.expiresAt ? new Date(result.key.expiresAt).toISOString() : null,
      permissions,
    };
  } catch {
    return { valid: false, reason: "invalid" };
  }
}

export async function resolveMcpApiKeyUserId(token: string, permission: McpPermission): Promise<string | null> {
  const result = await verifyMcpApiKey(token, permission);
  return result.valid ? result.userId : null;
}

type LegacyConsumer = "cli" | "telegram" | "local-mcp" | "remote-mcp" | "unknown";
type LegacySessionEnv = {
  LEGACY_SESSION_AUTH_ENABLED?: string;
  LEGACY_SESSION_AUTH_CLI_ENABLED?: string;
};

export function legacyConsumer(request: Request): LegacyConsumer {
  const declared = request.headers.get("x-paridade-consumer");
  if (["cli", "telegram", "local-mcp", "remote-mcp"].includes(declared ?? "")) return declared as LegacyConsumer;
  const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";
  if (userAgent.includes("paridade-risco-cli")) return "cli";
  return "unknown";
}

export function legacySessionEnabled(
  consumer: LegacyConsumer,
  env: LegacySessionEnv = process.env as LegacySessionEnv,
): boolean {
  if (env.LEGACY_SESSION_AUTH_ENABLED === "false") return false;
  if (consumer === "cli" && env.LEGACY_SESSION_AUTH_CLI_ENABLED === "false") return false;
  return true;
}

function logLegacySession(consumer: LegacyConsumer, outcome: "accepted" | "rejected" | "disabled") {
  console.info(`[auth-telemetry] ${JSON.stringify({ event: "legacy_session_auth", consumer, outcome })}`);
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
    const consumer = legacyConsumer(request);
    if (!legacySessionEnabled(consumer)) {
      logLegacySession(consumer, "disabled");
    } else {
      const session = await db.query.sessions.findFirst({
        where: and(eq(sessions.token, sessionToken), gt(sessions.expiresAt, new Date())),
        columns: { userId: true },
      });

      if (session) {
        logLegacySession(consumer, "accepted");
        return session.userId;
      }
      logLegacySession(consumer, "rejected");
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
