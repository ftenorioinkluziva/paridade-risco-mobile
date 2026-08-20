import { NextResponse } from "next/server";

import { getActiveBasket } from "@/lib/portfolio";
import { resolveUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const basket = await getActiveBasket(userId);

  if (!basket) {
    return NextResponse.json({ error: "No active basket" }, { status: 404 });
  }

  return NextResponse.json({
    id: basket.id,
    name: basket.name,
    description: basket.description,
  });
}
