import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { sessions } from "@/db/schema";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : request.headers.get("x-session-token");

  if (!token) {
    return NextResponse.json({ ok: true });
  }

  await db.delete(sessions).where(eq(sessions.token, token));

  return NextResponse.json({ ok: true });
}
