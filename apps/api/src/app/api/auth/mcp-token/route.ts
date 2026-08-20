import { NextResponse } from "next/server";
import { z } from "zod";

import { auth, MCP_API_KEY_CONFIG_ID } from "@/lib/auth";

const createTokenSchema = z.object({
  name: z.string().min(1).max(255),
  permissions: z.array(z.enum(["read", "sync", "mapping"])).min(1),
});

export async function POST(request: Request) {
  const cookie = request.headers.get("cookie");
  if (!cookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await auth.api.getSession({
    headers: new Headers({ cookie }),
  });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createTokenSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid MCP token configuration" }, { status: 400 });
  }

  const created = await auth.api.createApiKey({
    body: {
      configId: MCP_API_KEY_CONFIG_ID,
      name: parsed.data.name,
      permissions: { mcp: parsed.data.permissions },
      userId: session.user.id,
    },
  });

  return NextResponse.json(created);
}
