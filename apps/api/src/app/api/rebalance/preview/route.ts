import { NextResponse } from "next/server";

import { buildRebalancePreview, getActiveBasket, getPortfolioSnapshot } from "@/lib/portfolio";
import { resolveUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({
      portfolioValue: 0,
      driftPercentage: 0,
      targetBasketName: "Sem usuario",
      actions: [],
    });
  }

  const snapshot = await getPortfolioSnapshot(userId);
  const basket = await getActiveBasket(userId);

  return NextResponse.json(
    buildRebalancePreview({
      basket: basket ?? null,
      positions: snapshot.positions,
      totalValue: snapshot.totalValue,
    }),
  );
}
