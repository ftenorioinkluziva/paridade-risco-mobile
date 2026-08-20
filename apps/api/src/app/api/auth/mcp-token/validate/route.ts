import { NextResponse } from "next/server";

import { verifyMcpApiKey } from "@/lib/session";
import { extractBearerToken } from "@/lib/mcp-auth-rules";
import type { McpPermission } from "@/lib/mcp-auth-rules";

const errorByReason = {
  missing: { code: "API_KEY_MISSING", message: "API key is missing" },
  invalid: { code: "API_KEY_INVALID", message: "API key is invalid" },
  expired: { code: "API_KEY_EXPIRED", message: "API key is expired" },
  revoked: { code: "API_KEY_REVOKED", message: "API key is revoked" },
  insufficient_scope: { code: "API_KEY_INSUFFICIENT_SCOPE", message: "API key does not grant the required scope" },
} as const;
const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const token = extractBearerToken(request);
  const requested = new URL(request.url).searchParams.get("permission") ?? "read";
  const permission = ["read", "sync", "mapping"].includes(requested) ? requested as McpPermission : null;
  if (!permission) {
    return NextResponse.json({
      success: false,
      error: { code: "INVALID_INPUT", category: "validation", message: "Unknown API key permission", retryable: false },
    }, { status: 400, headers: noStore });
  }
  const result = await verifyMcpApiKey(token, permission);

  if (!result.valid) {
    const error = errorByReason[result.reason];
    return NextResponse.json({
      success: false,
      error: { ...error, category: "authorization", retryable: false },
    }, { status: result.reason === "insufficient_scope" ? 403 : 401, headers: noStore });
  }

  return NextResponse.json({
    valid: true,
    keyId: result.keyId,
    expiresAt: result.expiresAt,
    permissions: result.permissions,
  }, { headers: noStore });
}
