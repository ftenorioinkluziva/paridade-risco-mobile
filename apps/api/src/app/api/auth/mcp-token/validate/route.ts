import { NextResponse } from "next/server";

import { resolveMcpApiKeyUserId } from "@/lib/session";
import { extractBearerToken } from "@/lib/mcp-auth-rules";

export async function GET(request: Request) {
  const token = extractBearerToken(request);
  const userId = token ? await resolveMcpApiKeyUserId(token, "read") : null;

  if (!userId) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}
