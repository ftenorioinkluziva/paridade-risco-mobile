import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { basketAllocations, baskets, investmentFunds, portfolios, transactions, users } from "@/db/schema";
import { toNumber } from "./number";

type Position = {
  assetId: string;
  ticker: string;
  name: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  allocationPercentage: number;
};

export async function getPortfolioSnapshot(userId: string) {
  const userTransactions = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    with: {
      asset: {
        columns: {
          id: true,
          ticker: true,
          name: true,
        },
      },
    },
    orderBy: [desc(transactions.tradedAt)],
  });

  const positionMap = new Map<string, Position>();
  const [portfolioRow, userFunds] = await Promise.all([
    db.query.portfolios.findFirst({
      where: eq(portfolios.userId, userId),
      columns: {
        cashBalance: true,
      },
    }),
    db.query.investmentFunds.findMany({
      where: eq(investmentFunds.userId, userId),
      columns: {
        currentValue: true,
        initialInvestment: true,
      },
    }),
  ]);

  for (const transaction of userTransactions) {
    const signedShares = toNumber(transaction.shares) * (transaction.type === "COMPRA" ? 1 : -1);
    const signedCost = toNumber(transaction.shares) * toNumber(transaction.pricePerShare) * (transaction.type === "COMPRA" ? 1 : -1);
    const current = positionMap.get(transaction.assetId) ?? {
      assetId: transaction.assetId,
      ticker: transaction.asset.ticker,
      name: transaction.asset.name,
      shares: 0,
      costBasis: 0,
      currentPrice: 0,
      currentValue: 0,
      allocationPercentage: 0,
    };

    current.shares += signedShares;
    current.costBasis += signedCost;
    positionMap.set(transaction.assetId, current);
  }

  const openPositions = Array.from(positionMap.values()).filter((position) => position.shares > 0);

  // Get latest prices using DISTINCT ON — returns exactly 1 row per asset
  const latestPriceMap = new Map<string, number>();

  if (openPositions.length > 0) {
    const assetIds = openPositions.map((position) => position.assetId);
    const latestPriceRows = await db.execute<{ asset_id: string; price: string }>(
      sql`
        SELECT DISTINCT ON (asset_id) asset_id, price
        FROM historical_prices
        WHERE asset_id = ANY(ARRAY[${sql.join(assetIds.map((id) => sql`${id}`), sql`, `)}]::text[])
        ORDER BY asset_id, price_date DESC
      `,
    );

    for (const row of latestPriceRows) {
      latestPriceMap.set(row.asset_id, toNumber(row.price));
    }
  }

  let totalValue = 0;

  for (const position of openPositions) {
    position.currentPrice = latestPriceMap.get(position.assetId) ?? 0;
    position.currentValue = position.currentPrice * position.shares;
    totalValue += position.currentValue;
  }

  const fundsCurrentValue = userFunds.reduce((sum, fund) => sum + toNumber(fund.currentValue), 0);
  const fundsGain = userFunds.reduce(
    (sum, fund) => sum + (toNumber(fund.currentValue) - toNumber(fund.initialInvestment)),
    0,
  );
  const cashBalance = toNumber(portfolioRow?.cashBalance ?? 0);
  totalValue += fundsCurrentValue + cashBalance;

  for (const position of openPositions) {
    position.allocationPercentage = totalValue > 0 ? (position.currentValue / totalValue) * 100 : 0;
  }

  const unrealizedGain =
    openPositions.reduce((sum, position) => sum + (position.currentValue - position.costBasis), 0) + fundsGain;
  const positionsValue = openPositions.reduce((sum, position) => sum + position.currentValue, 0);

  return {
    totalValue,
    unrealizedGain,
    cashBalance,
    fundsValue: fundsCurrentValue,
    positionsValue,
    positions: openPositions.sort((left, right) => right.currentValue - left.currentValue),
  };
}

export async function getActiveBasket(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      selectedBasketId: true,
    },
  });

  if (user?.selectedBasketId) {
    return db.query.baskets.findFirst({
      where: eq(baskets.id, user.selectedBasketId),
      with: {
        allocations: {
          with: {
            asset: {
              columns: {
                ticker: true,
                name: true,
              },
            },
          },
          orderBy: [basketAllocations.sortOrder],
        },
      },
    });
  }

  return db.query.baskets.findFirst({
    where: eq(baskets.userId, userId),
    with: {
      allocations: {
        with: {
          asset: {
            columns: {
              ticker: true,
              name: true,
            },
          },
        },
        orderBy: [basketAllocations.sortOrder],
      },
    },
    orderBy: [desc(baskets.createdAt)],
  });
}

export function buildRebalancePreview(args: {
  basket:
    | {
        id: string;
        name: string;
        allocations: Array<{
          targetPercentage: string;
          asset: { ticker: string; name: string };
        }>;
      }
    | null;
  positions: Position[];
  totalValue: number;
  indexedFundValuesByTicker?: Record<string, number>;
}) {
  if (!args.basket) {
    return {
      portfolioValue: args.totalValue,
      driftPercentage: 0,
      targetBasketName: "Sem cesta ativa",
      actions: [],
    };
  }

  const positionByTicker = new Map(args.positions.map((position) => [position.ticker, position]));
  const indexedFundValuesByTicker = args.indexedFundValuesByTicker ?? {};
  const actions = args.basket.allocations
    .map((allocation, index) => {
      const targetPercentage = toNumber(allocation.targetPercentage);
      const position = positionByTicker.get(allocation.asset.ticker);
      const indexedFundValue = indexedFundValuesByTicker[allocation.asset.ticker] ?? 0;
      const currentValue = (position?.currentValue ?? 0) + indexedFundValue;
      const currentPercentage = args.totalValue > 0 ? (currentValue / args.totalValue) * 100 : 0;
      const targetValue = (targetPercentage / 100) * args.totalValue;
      const diffValue = targetValue - currentValue;

      return {
        id: `${args.basket?.id}-${index}`,
        ticker: allocation.asset.ticker,
        action: diffValue >= 0 ? "APORTAR" : "REDUZIR",
        amount: Math.abs(diffValue),
        currentPrice: position?.currentPrice ?? 0,
        currentPercentage,
        targetPercentage,
      };
    })
    .filter((action) => action.amount > 0.01)
    .sort((left, right) => right.amount - left.amount);

  const driftPercentage =
    actions.reduce((sum, action) => sum + Math.abs(action.targetPercentage - action.currentPercentage), 0) / 2;

  return {
    portfolioValue: args.totalValue,
    driftPercentage,
    targetBasketName: args.basket.name,
    actions,
  };
}

export function getRebalanceEligibility(args: {
  birthDate: Date | null;
  phone: string | null;
  role: "ADMIN" | "USER";
}) {
  const missingProfileFields: string[] = [];

  if (!args.phone) {
    missingProfileFields.push("phone");
  }

  if (!args.birthDate) {
    missingProfileFields.push("birthDate");
  }

  if (!args.role) {
    missingProfileFields.push("role");
  }

  return {
    eligibleForRebalance: missingProfileFields.length === 0,
    missingProfileFields,
  };
}
