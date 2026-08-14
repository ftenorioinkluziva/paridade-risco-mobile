import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { investmentFunds } from "@/db/schema";
import { getActiveBasket, getPortfolioSnapshot } from "@/lib/portfolio";
import { getPortfolioSourceMode } from "@/lib/portfolio-source";
import { getPluggyPortfolioSummary } from "@/lib/pluggy/summary";
import { resolveUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({
      totalValue: 0,
      positionsValue: 0,
      fundsValue: 0,
      cashBalance: 0,
      positionCount: 0,
      basketDriftPercentage: 0,
      unrealizedGain: 0,
      allocation: [],
      positions: [],
    });
  }

  const sourceMode = await getPortfolioSourceMode(userId);
  if (sourceMode === "PLUGGY") {
    return NextResponse.json(await getPluggyPortfolioSummary(userId));
  }

  const snapshot = await getPortfolioSnapshot(userId);
  const activeBasket = await getActiveBasket(userId);
  const allFunds = await db.query.investmentFunds.findMany({
    where: eq(investmentFunds.userId, userId),
    columns: {
      id: true,
      name: true,
      initialInvestment: true,
      currentValue: true,
      investmentDate: true,
      indexAssetId: true,
    },
    with: {
      indexAsset: {
        columns: {
          ticker: true,
        },
      },
    },
  });

  const indexedFundValuesByTicker = allFunds.reduce<Record<string, number>>((acc, fund) => {
    const ticker = fund.indexAsset?.ticker;

    if (!ticker) {
      return acc;
    }

    acc[ticker] = (acc[ticker] ?? 0) + Number(fund.currentValue);
    return acc;
  }, {});

  let basketDriftPercentage = 0;

  if (activeBasket) {
    const positionValueByTicker = new Map(snapshot.positions.map((position) => [position.ticker, position.currentValue]));

    basketDriftPercentage =
      activeBasket.allocations.reduce((sum, allocation) => {
        const positionValue = positionValueByTicker.get(allocation.asset.ticker) ?? 0;
        const indexedFundValue = indexedFundValuesByTicker[allocation.asset.ticker] ?? 0;
        const currentValue = positionValue + indexedFundValue;
        const current = snapshot.totalValue > 0 ? (currentValue / snapshot.totalValue) * 100 : 0;
        return sum + Math.abs(Number(allocation.targetPercentage) - current);
      }, 0) / 2;
  }

  const targetByTicker = activeBasket
    ? new Map(activeBasket.allocations.map((alloc) => [alloc.asset.ticker, Number(alloc.targetPercentage)]))
    : new Map<string, number>();

  const positionByTicker = new Map(snapshot.positions.map((position) => [position.ticker, position]));

  const allocation = activeBasket
    ? activeBasket.allocations.map((allocation, index) => {
        const ticker = allocation.asset.ticker;
        const position = positionByTicker.get(ticker);
        const indexedFundValue = indexedFundValuesByTicker[ticker] ?? 0;
        const currentValue = (position?.currentValue ?? 0) + indexedFundValue;
        const percentage = snapshot.totalValue > 0 ? (currentValue / snapshot.totalValue) * 100 : 0;

        return {
          id: position?.assetId ?? `${activeBasket.id}-${ticker}-${index}`,
          ticker,
          label: allocation.asset.name,
          percentage,
          targetPercentage: Number(allocation.targetPercentage),
        };
      })
    : snapshot.positions.map((position) => ({
        id: position.assetId,
        ticker: position.ticker,
        label: position.name,
        percentage: position.allocationPercentage,
        targetPercentage: targetByTicker.get(position.ticker) ?? 0,
      }));

  return NextResponse.json({
    totalValue: snapshot.totalValue,
    positionsValue: snapshot.positionsValue,
    fundsValue: snapshot.fundsValue,
    cashBalance: snapshot.cashBalance,
    positionCount: snapshot.positions.length,
    basketDriftPercentage,
    unrealizedGain: snapshot.unrealizedGain,
    allocation,
    positions: snapshot.positions.map((position) => {
      const gain = position.currentValue - position.costBasis;
      const gainPercentage = position.costBasis > 0 ? (gain / position.costBasis) * 100 : 0;

      return {
        id: position.assetId,
        ticker: position.ticker,
        name: position.name,
        shares: position.shares,
        averagePrice: position.shares > 0 ? position.costBasis / position.shares : 0,
        currentPrice: position.currentPrice,
        currentValue: position.currentValue,
        gain,
        gainPercentage,
        dailyChangePercentage: position.dailyChangePercentage,
      };
    }),
    funds: allFunds.map((fund) => {
      const initial = Number(fund.initialInvestment);
      const current = Number(fund.currentValue);
      const gain = current - initial;
      const gainPercentage = initial > 0 ? (gain / initial) * 100 : 0;

      return {
        id: fund.id,
        name: fund.name,
        indexTicker: fund.indexAsset?.ticker ?? undefined,
        initialInvestment: initial,
        currentValue: current,
        gain,
        gainPercentage,
        investmentDate: fund.investmentDate.toISOString(),
      };
    }),
  });
}
