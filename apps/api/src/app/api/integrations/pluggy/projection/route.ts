import { NextResponse } from "next/server";

import { getPluggyProjection } from "@/lib/pluggy/projection";
import { resolveUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 401 });
  }

  return NextResponse.json(await getPluggyProjection(userId));
}
