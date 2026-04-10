import { NextResponse } from "next/server";

import { getActiveBasket, getPortfolioSnapshot } from "@/lib/portfolio";
import { resolveUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({
      totalValue: 0,
      basketDriftPercentage: 0,
      unrealizedGain: 0,
      allocation: [],
    });
  }

  const snapshot = await getPortfolioSnapshot(userId);
  const activeBasket = await getActiveBasket(userId);

  let basketDriftPercentage = 0;

  if (activeBasket) {
    const allocationMap = new Map(snapshot.positions.map((position) => [position.ticker, position.allocationPercentage]));

    basketDriftPercentage =
      activeBasket.allocations.reduce((sum, allocation) => {
        const current = allocationMap.get(allocation.asset.ticker) ?? 0;
        return sum + Math.abs(Number(allocation.targetPercentage) - current);
      }, 0) / 2;
  }

  return NextResponse.json({
    totalValue: snapshot.totalValue,
    basketDriftPercentage,
    unrealizedGain: snapshot.unrealizedGain,
    allocation: snapshot.positions.map((position) => ({
      id: position.assetId,
      label: position.name,
      percentage: position.allocationPercentage,
    })),
  });
}
