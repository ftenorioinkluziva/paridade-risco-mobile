import { NextResponse } from "next/server";

import { getPluggyFinancialHealth } from "@/lib/pluggy/financial-health";
import { resolveUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 401 });
  }

  const value = new URL(request.url).searchParams.get("days");
  const days = value && Number.isInteger(Number(value)) ? Math.min(365, Math.max(1, Number(value))) : 90;
  return NextResponse.json(await getPluggyFinancialHealth(userId, { periodDays: days }));
}
