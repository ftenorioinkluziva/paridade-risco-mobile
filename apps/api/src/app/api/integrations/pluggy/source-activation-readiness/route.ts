import { NextResponse } from "next/server";

import { getPluggySourceActivationReadiness } from "@/lib/pluggy/source-activation";
import { resolveUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "No user available" }, { status: 401 });
  return NextResponse.json(await getPluggySourceActivationReadiness(userId));
}
