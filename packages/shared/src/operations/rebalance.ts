import type { RawPosition, RebalanceAction, RebalancePreview, ActiveBasket } from "../types/domain";

/**
 * Build rebalance actions from basket targets vs current positions.
 * Pure computation — no database dependency.
 */
export function buildRebalancePreview(args: {
  basket: ActiveBasket | null;
  positions: RawPosition[];
  totalValue: number;
  indexedFundValuesByTicker?: Record<string, number>;
  currentPricesByTicker?: Record<string, number>;
}): RebalancePreview {
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
  const currentPricesByTicker = args.currentPricesByTicker ?? {};

  const actions: RebalanceAction[] = args.basket.allocations
    .map((allocation, index) => {
      const targetPercentage = allocation.targetPercentage;
      const position = positionByTicker.get(allocation.asset.ticker);
      const indexedFundValue = indexedFundValuesByTicker[allocation.asset.ticker] ?? 0;
      const currentValue = (position?.currentValue ?? 0) + indexedFundValue;
      const currentPercentage = args.totalValue > 0 ? (currentValue / args.totalValue) * 100 : 0;
      const targetValue = (targetPercentage / 100) * args.totalValue;
      const diffValue = targetValue - currentValue;
      const currentPrice = currentPricesByTicker[allocation.asset.ticker] ?? position?.currentPrice ?? 0;

      return {
        id: `${args.basket!.id}-${index}`,
        ticker: allocation.asset.ticker,
        action: diffValue >= 0 ? "APORTAR" as const : "REDUZIR" as const,
        amount: Math.abs(diffValue),
        currentPrice,
        estimatedQuantity: currentPrice > 0 ? Math.round((Math.abs(diffValue) / currentPrice) * 100) / 100 : null,
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
 * Check if a user is eligible for rebalance based on profile completeness.
 * Pure computation — no database dependency.
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

/**
 * Calculate drift percentage between current allocations and basket targets.
 */
export function calculateDrift(args: {
  basket: { allocations: Array<{ targetPercentage: number; asset: { ticker: string } }> };
  positions: RawPosition[];
  totalValue: number;
  indexedFundValuesByTicker?: Record<string, number>;
}): number {
  const positionByTicker = new Map(args.positions.map((p) => [p.ticker, p]));
  const indexedFundValuesByTicker = args.indexedFundValuesByTicker ?? {};

  return (
    args.basket.allocations.reduce((sum, allocation) => {
      const positionValue = positionByTicker.get(allocation.asset.ticker)?.currentValue ?? 0;
      const indexedFundValue = indexedFundValuesByTicker[allocation.asset.ticker] ?? 0;
      const currentValue = positionValue + indexedFundValue;
      const current = args.totalValue > 0 ? (currentValue / args.totalValue) * 100 : 0;
      return sum + Math.abs(allocation.targetPercentage - current);
    }, 0) / 2
  );
}
