import { desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { basketAllocations, baskets, historicalPrices, transactions, users } from "@/db/schema";
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

  if (openPositions.length === 0) {
    return {
      totalValue: 0,
      unrealizedGain: 0,
      positions: [],
    };
  }

  const latestPriceRows = await db
    .select({
      assetId: historicalPrices.assetId,
      price: historicalPrices.price,
      rowNumber:
        sql<number>`row_number() over (partition by ${historicalPrices.assetId} order by ${historicalPrices.priceDate} desc)`.as(
          "row_number",
        ),
    })
    .from(historicalPrices)
    .where(inArray(historicalPrices.assetId, openPositions.map((position) => position.assetId)));

  const latestPriceMap = new Map<string, number>();

  for (const row of latestPriceRows) {
    if (row.rowNumber === 1) {
      latestPriceMap.set(row.assetId, toNumber(row.price));
    }
  }

  let totalValue = 0;

  for (const position of openPositions) {
    position.currentPrice = latestPriceMap.get(position.assetId) ?? 0;
    position.currentValue = position.currentPrice * position.shares;
    totalValue += position.currentValue;
  }

  for (const position of openPositions) {
    position.allocationPercentage = totalValue > 0 ? (position.currentValue / totalValue) * 100 : 0;
  }

  const unrealizedGain = openPositions.reduce((sum, position) => sum + (position.currentValue - position.costBasis), 0);

  return {
    totalValue,
    unrealizedGain,
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
  const actions = args.basket.allocations
    .map((allocation, index) => {
      const targetPercentage = toNumber(allocation.targetPercentage);
      const currentPercentage = positionByTicker.get(allocation.asset.ticker)?.allocationPercentage ?? 0;
      const diff = targetPercentage - currentPercentage;

      return {
        id: `${args.basket?.id}-${index}`,
        ticker: allocation.asset.ticker,
        action: diff >= 0 ? "APORTAR" : "REDUZIR",
        amount: Math.abs((diff / 100) * args.totalValue),
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
