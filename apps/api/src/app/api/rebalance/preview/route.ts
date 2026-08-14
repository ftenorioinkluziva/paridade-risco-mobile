import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { investmentFunds, users } from "@/db/schema";
import { buildRebalancePreview, getActiveBasket, getPortfolioSnapshot, getRebalanceEligibility } from "@/lib/portfolio";
import { resolveUserId } from "@/lib/session";
import { getPortfolioSourceMode } from "@/lib/portfolio-source";
import { getPluggyRebalancePreview } from "@/lib/pluggy/rebalance";
import { and, eq, isNotNull } from "drizzle-orm";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);
  const includeCash = true;

  if (!userId) {
    return NextResponse.json({
      portfolioValue: 0,
      driftPercentage: 0,
      targetBasketName: "Sem usuario",
      actions: [],
    });
  }

  const sourceMode = await getPortfolioSourceMode(userId);
  if (sourceMode === "PLUGGY") {
    return NextResponse.json(await getPluggyRebalancePreview(userId));
  }

  const snapshot = await getPortfolioSnapshot(userId);
  const basket = await getActiveBasket(userId);
  const indexedFunds = await db.query.investmentFunds.findMany({
    where: and(eq(investmentFunds.userId, userId), isNotNull(investmentFunds.indexAssetId)),
    columns: {
      currentValue: true,
    },
    with: {
      indexAsset: {
        columns: {
          ticker: true,
        },
      },
    },
  });

  const indexedFundValuesByTicker = indexedFunds.reduce<Record<string, number>>((acc, fund) => {
    const ticker = fund.indexAsset?.ticker;

    if (!ticker) {
      return acc;
    }

    acc[ticker] = (acc[ticker] ?? 0) + Number(fund.currentValue);
    return acc;
  }, {});

  const investedValue = snapshot.positionsValue + snapshot.fundsValue;
  const calculationBaseValue = snapshot.totalValue;
  const effectiveBaseValue = calculationBaseValue > 0 ? calculationBaseValue : snapshot.totalValue;
  const userProfile = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      birthDate: true,
      phone: true,
      role: true,
    },
  });

  const eligibility = getRebalanceEligibility({
    birthDate: userProfile?.birthDate ?? null,
    phone: userProfile?.phone ?? null,
    role: userProfile?.role ?? "USER",
  });

  if (!eligibility.eligibleForRebalance) {
    return NextResponse.json({
      portfolioValue: effectiveBaseValue,
      investedValue,
      cashAvailable: snapshot.cashBalance,
      calculationBaseValue: effectiveBaseValue,
      rebalanceCost: 0,
      postRebalanceCash: snapshot.cashBalance,
      includeCash,
      driftPercentage: 0,
      targetBasketName: basket?.name ?? "Sem cesta ativa",
      actions: [],
      eligibleForRebalance: false,
      missingProfileFields: eligibility.missingProfileFields,
    });
  }

  const preview = buildRebalancePreview({
    basket: basket ?? null,
    positions: snapshot.positions,
    totalValue: effectiveBaseValue,
    indexedFundValuesByTicker,
  });
  const buyCost = preview.actions
    .filter((action) => action.action === "APORTAR")
    .reduce((sum, action) => sum + action.amount, 0);
  const sellProceeds = preview.actions
    .filter((action) => action.action === "REDUZIR")
    .reduce((sum, action) => sum + action.amount, 0);

  return NextResponse.json({
    ...preview,
    investedValue,
    cashAvailable: snapshot.cashBalance,
    calculationBaseValue: effectiveBaseValue,
    rebalanceCost: buyCost,
    postRebalanceCash: snapshot.cashBalance - buyCost + sellProceeds,
    includeCash,
    portfolioValue: effectiveBaseValue,
    driftPercentage: preview.driftPercentage,
    targetBasketName: preview.targetBasketName,
    actions: preview.actions,
    eligibleForRebalance: true,
    missingProfileFields: [],
  });
}
