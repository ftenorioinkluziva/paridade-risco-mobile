import { NextResponse } from "next/server";

import { getPluggyFinancialOverview } from "@/lib/pluggy/financial-overview";
import { resolveUserId } from "@/lib/session";

function parseDays(request: Request) {
  const value = new URL(request.url).searchParams.get("days");
  if (!value) return 90;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(365, Math.max(1, parsed)) : 90;
}

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 401 });
  }

  return NextResponse.json(await getPluggyFinancialOverview(userId, { periodDays: parseDays(request) }));
}
