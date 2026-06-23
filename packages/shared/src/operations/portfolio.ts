import type { PositionSnapshot, PortfolioSnapshot, ActiveBasket, BasketAllocation } from "../types/domain";

type DbRecord = Record<string, unknown>;

interface QueryHelpers {
  findFirst: (args?: { where?: unknown; columns?: Record<string, boolean>; with?: Record<string, unknown>; orderBy?: unknown[] }) => Promise<DbRecord | null>;
  findMany: (args?: { where?: unknown; columns?: Record<string, boolean>; with?: Record<string, unknown>; orderBy?: unknown[] }) => Promise<DbRecord[]>;
}

type AnyDb = {
  query: Record<string, QueryHelpers>;
  execute: (query: unknown) => Promise<DbRecord[]>;
  select: (fields?: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => {
        orderBy: (order: unknown) => Promise<DbRecord[]>;
        limit: (n: number) => Promise<DbRecord[]>;
      };
      orderBy: (order: unknown) => Promise<DbRecord[]>;
      limit: (n: number) => Promise<DbRecord[]>;
    };
  };
  insert: (table: unknown) => {
    values: (data: unknown[]) => Promise<DbRecord[]>;
  };
};

/**
 * Build a portfolio snapshot for a given user.
 * Aggregates transactions, latest prices, funds, and cash balance.
 */
export async function getPortfolioSnapshot(
  db: AnyDb,
  userId: string,
): Promise<PortfolioSnapshot> {
  const userTransactions = await db.query.transactions.findMany({
    where: { userId },
    with: {
      asset: {
        columns: { id: true, ticker: true, name: true },
      },
    },
    orderBy: [{ field: "tradedAt", direction: "DESC" }],
  });

  const positionMap = new Map<string, PositionSnapshot>();

  for (const tx of userTransactions) {
    const asset = tx.asset as { id: string; ticker: string; name: string };
    const signedShares = Number(tx.shares) * (tx.type === "COMPRA" ? 1 : -1);
    const signedCost =
      Number(tx.shares) * Number(tx.pricePerShare) * (tx.type === "COMPRA" ? 1 : -1);
    const current = positionMap.get(asset.id) ?? {
      assetId: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      shares: 0,
      costBasis: 0,
      currentPrice: 0,
      currentValue: 0,
      dailyChangePercentage: null,
      allocationPercentage: 0,
    };
    current.shares += signedShares;
    current.costBasis += signedCost;
    positionMap.set(asset.id, current);
  }

  const openPositions = Array.from(positionMap.values()).filter((p) => p.shares > 0);

  // Get latest 2 prices per asset
  const latestPriceMap = new Map<string, number>();
  const previousPriceMap = new Map<string, number>();

  if (openPositions.length > 0) {
    // Simpler approach: query individual prices
    for (const pos of openPositions) {
      const rows = await db
        .select({ price: "price", priceDate: "price_date" })
        .from("historical_prices")
        .where({ assetId: pos.assetId })
        .orderBy({ field: "price_date", direction: "DESC" })
        .limit(2);

      if (rows.length >= 1) {
        latestPriceMap.set(pos.assetId, Number(rows[0].price));
      }
      if (rows.length >= 2) {
        previousPriceMap.set(pos.assetId, Number(rows[1].price));
      }
    }
  }

  // Also fetch funds and portfolio
  const [portfolioRow, userFunds] = await Promise.all([
    db.query.portfolios.findFirst({
      where: { userId },
      columns: { cashBalance: true },
    }),
    db.query.investmentFunds.findMany({
      where: { userId },
      columns: { currentValue: true, initialInvestment: true },
    }),
  ]);

  let totalValue = 0;
  for (const position of openPositions) {
    position.currentPrice = latestPriceMap.get(position.assetId) ?? 0;
    const prevPrice = previousPriceMap.get(position.assetId);
    position.dailyChangePercentage =
      prevPrice != null && prevPrice !== 0 && position.currentPrice > 0
        ? ((position.currentPrice - prevPrice) / prevPrice) * 100
        : null;
    position.currentValue = position.currentPrice * position.shares;
    totalValue += position.currentValue;
  }

  const fundsCurrentValue = (userFunds as { currentValue: string }[]).reduce(
    (sum, f) => sum + Number(f.currentValue),
    0,
  );
  const fundsGain = (userFunds as { currentValue: string; initialInvestment: string }[]).reduce(
    (sum, f) => sum + (Number(f.currentValue) - Number(f.initialInvestment)),
    0,
  );
  const cashBalance = Number((portfolioRow as { cashBalance?: string })?.cashBalance ?? 0);
  totalValue += fundsCurrentValue + cashBalance;

  for (const position of openPositions) {
    position.allocationPercentage = totalValue > 0 ? (position.currentValue / totalValue) * 100 : 0;
  }

  const unrealizedGain =
    openPositions.reduce((sum, p) => sum + (p.currentValue - p.costBasis), 0) + fundsGain;
  const positionsValue = openPositions.reduce((sum, p) => sum + p.currentValue, 0);

  return {
    totalValue,
    unrealizedGain,
    cashBalance,
    fundsValue: fundsCurrentValue,
    positionsValue,
    positions: openPositions.sort((a, b) => b.currentValue - a.currentValue),
  };
}

/**
 * Get the active basket for a user.
 */
export async function getActiveBasket(
  db: AnyDb,
  userId: string,
): Promise<ActiveBasket | null> {
  const user = await db.query.users.findFirst({
    where: { userId },
    columns: { selectedBasketId: true },
  });

  const selectedBasketId = (user as { selectedBasketId?: string })?.selectedBasketId;

  if (selectedBasketId) {
    const basket = await db.query.baskets.findFirst({
      where: { id: selectedBasketId },
      with: {
        allocations: {
          with: {
            asset: { columns: { ticker: true, name: true } },
          },
          orderBy: [{ field: "sortOrder", direction: "ASC" }],
        },
      },
    });
    if (basket) return basket as unknown as ActiveBasket;
  }

  const basket = await db.query.baskets.findFirst({
    where: { userId },
    with: {
      allocations: {
        with: {
          asset: { columns: { ticker: true, name: true } },
        },
        orderBy: [{ field: "sortOrder", direction: "ASC" }],
      },
    },
    orderBy: [{ field: "createdAt", direction: "DESC" }],
  });

  return basket as unknown as ActiveBasket | null;
}

/**
 * Calculate rebalance actions from basket targets vs current positions.
 */
export function buildRebalancePreview(args: {
  basket: ActiveBasket | null;
  positions: PositionSnapshot[];
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

  const positionByTicker = new Map(args.positions.map((p) => [p.ticker, p]));
  const indexedFundValuesByTicker = args.indexedFundValuesByTicker ?? {};

  const actions = args.basket.allocations
    .map((allocation, index) => {
      const targetPercentage = Number(allocation.targetPercentage);
      const position = positionByTicker.get(allocation.asset.ticker);
      const indexedFundValue = indexedFundValuesByTicker[allocation.asset.ticker] ?? 0;
      const currentValue = (position?.currentValue ?? 0) + indexedFundValue;
      const currentPercentage = args.totalValue > 0 ? (currentValue / args.totalValue) * 100 : 0;
      const targetValue = (targetPercentage / 100) * args.totalValue;
      const diffValue = targetValue - currentValue;

      return {
        id: `${args.basket!.id}-${index}`,
        ticker: allocation.asset.ticker,
        action: diffValue >= 0 ? "APORTAR" as const : "REDUZIR" as const,
        amount: Math.abs(diffValue),
        currentPrice: position?.currentPrice ?? 0,
        currentPercentage,
        targetPercentage,
      };
    })
    .filter((action) => action.amount > 0.01)
    .sort((a, b) => b.amount - a.amount);

  const driftPercentage =
    actions.reduce((sum, a) => sum + Math.abs(a.targetPercentage - a.currentPercentage), 0) / 2;

  return {
    portfolioValue: args.totalValue,
    driftPercentage,
    targetBasketName: args.basket.name,
    actions,
  };
}

/**
 * Check if a user is eligible for rebalance.
 */
export function getRebalanceEligibility(args: {
  birthDate: Date | null;
  phone: string | null;
  role: string;
}): { eligibleForRebalance: boolean; missingProfileFields: string[] } {
  const missingProfileFields: string[] = [];
  if (!args.phone) missingProfileFields.push("phone");
  if (!args.birthDate) missingProfileFields.push("birthDate");
  if (!args.role) missingProfileFields.push("role");
  return {
    eligibleForRebalance: missingProfileFields.length === 0,
    missingProfileFields,
  };
}