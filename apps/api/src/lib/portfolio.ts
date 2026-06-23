import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { basketAllocations, baskets, investmentFunds, portfolios, transactions, users } from "@/db/schema";
import { toNumber } from "@/lib/number";

import {
  buildRebalancePreview,
  getRebalanceEligibility,
  calculateDrift,
} from "@paridade-risco/shared";

import type { RawPosition } from "@paridade-risco/shared";

/**
 * Get a full portfolio snapshot for a user.
 *
 * This function queries the database directly (Drizzle ORM) and
 * returns structured data consumed by route handlers and MCP tools.
 * Pure computation helpers (rebalance, drift) are imported from
 * @paridade-risco/shared.
 */
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

  const positionMap = new Map<string, RawPosition>();
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
      dailyChangePercentage: null,
      allocationPercentage: 0,
    };

    current.shares += signedShares;
    current.costBasis += signedCost;
    positionMap.set(transaction.assetId, current);
  }

  const openPositions = Array.from(positionMap.values()).filter((position) => position.shares > 0);

  // Get the two most recent prices per asset in one query
  const latestPriceMap = new Map<string, number>();
  const previousPriceMap = new Map<string, number>();

  if (openPositions.length > 0) {
    const assetIds = openPositions.map((position) => position.assetId);
    const recentPriceRows = await db.execute<{ asset_id: string; price: string; price_rank: number | string }>(
      sql`
        WITH ranked_prices AS (
          SELECT
            asset_id,
            price,
            ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY price_date DESC) AS price_rank
          FROM historical_prices
          WHERE asset_id = ANY(ARRAY[${sql.join(assetIds.map((id) => sql`${id}`), sql`, `)}]::text[])
        )
        SELECT asset_id, price, price_rank
        FROM ranked_prices
        WHERE price_rank <= 2
        ORDER BY asset_id, price_rank
      `,
    );

    for (const row of recentPriceRows) {
      const priceRank = Number(row.price_rank);
      const price = toNumber(row.price);

      if (priceRank === 1) {
        latestPriceMap.set(row.asset_id, price);
      }
      if (priceRank === 2) {
        previousPriceMap.set(row.asset_id, price);
      }
    }
  }

  let totalValue = 0;

  for (const position of openPositions) {
    position.currentPrice = latestPriceMap.get(position.assetId) ?? 0;
    const previousPrice = previousPriceMap.get(position.assetId);
    position.dailyChangePercentage =
      previousPrice != null &&
      previousPrice !== 0 &&
      Number.isFinite(position.currentPrice) &&
      Number.isFinite(previousPrice)
        ? ((position.currentPrice - previousPrice) / previousPrice) * 100
        : null;
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

function toActiveBasket(
  basket: {
    id: string;
    name: string;
    allocations: Array<{
      targetPercentage: string;
      asset: { ticker: string; name: string };
    }>;
  } | null | undefined,
) {
  if (!basket) return null;
  return {
    id: basket.id,
    name: basket.name,
    allocations: basket.allocations.map((a) => ({
      targetPercentage: Number(a.targetPercentage),
      asset: a.asset,
    })),
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
    const basket = await db.query.baskets.findFirst({
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
    return toActiveBasket(basket);
  }

  const basket = await db.query.baskets.findFirst({
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
  return toActiveBasket(basket);
}

// Re-export shared computation functions so route handlers
// can import everything from @/lib/portfolio
export { buildRebalancePreview, getRebalanceEligibility, calculateDrift };