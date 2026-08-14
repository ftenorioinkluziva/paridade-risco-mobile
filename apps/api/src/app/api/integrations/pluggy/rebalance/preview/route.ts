import { NextResponse } from "next/server";

import { getPluggyRebalancePreview } from "@/lib/pluggy/rebalance";
import { resolveUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 401 });
  }

  const rawCashForOrders = new URL(request.url).searchParams.get("cashForOrders");
  if (rawCashForOrders !== null && (!rawCashForOrders.trim() || !Number.isFinite(Number(rawCashForOrders)))) {
    return NextResponse.json({ error: "cashForOrders must be a finite number" }, { status: 400 });
  }

  return NextResponse.json(await getPluggyRebalancePreview(userId, {
    cashForOrders: rawCashForOrders === null ? undefined : Number(rawCashForOrders),
  }));
}
