import { getActiveBasket } from "@/lib/portfolio";
import { getPluggyPortfolioSnapshot } from "./portfolio-provider";

export async function getPluggyPortfolioSummary(userId: string) {
  const [snapshot, activeBasket] = await Promise.all([
    getPluggyPortfolioSnapshot(userId),
    getActiveBasket(userId),
  ]);
  const positionValueByTicker = new Map(snapshot.positions.map((position) => [position.ticker, position.currentValue]));
  const targetByTicker = new Map(activeBasket?.allocations.map((allocation) => [allocation.asset.ticker, Number(allocation.targetPercentage)]) ?? []);
  const basketDriftPercentage = activeBasket
    ? activeBasket.allocations.reduce((sum, allocation) => {
        const currentValue = positionValueByTicker.get(allocation.asset.ticker) ?? 0;
        const current = snapshot.totalValue > 0 ? (currentValue / snapshot.totalValue) * 100 : 0;
        return sum + Math.abs(Number(allocation.targetPercentage) - current);
      }, 0) / 2
    : 0;
  const unrealizedGain = snapshot.positions.reduce((sum, position) => {
    return sum + (position.costBasis === null ? 0 : position.currentValue - position.costBasis);
  }, 0);

  return {
    source: "PLUGGY" as const,
    observedAt: snapshot.observedAt?.toISOString() ?? null,
    totalValue: snapshot.totalValue,
    positionsValue: snapshot.investedValue,
    fundsValue: 0,
    cashBalance: snapshot.cashBalance,
    positionCount: snapshot.positions.length,
    basketDriftPercentage,
    unrealizedGain,
    outsideStrategyValue: snapshot.outsideStrategyValue,
    unresolvedValue: snapshot.unresolvedValue,
    unresolvedCount: snapshot.unresolvedCount,
    warnings: snapshot.warnings,
    allocation: activeBasket
      ? activeBasket.allocations.map((allocation, index) => {
          const ticker = allocation.asset.ticker;
          const currentValue = positionValueByTicker.get(ticker) ?? 0;
          return {
            id: `${activeBasket.id}-${ticker}-${index}`,
            ticker,
            label: allocation.asset.name,
            percentage: snapshot.totalValue > 0 ? (currentValue / snapshot.totalValue) * 100 : 0,
            targetPercentage: Number(allocation.targetPercentage),
          };
        })
      : snapshot.positions.map((position) => ({
          id: position.assetId,
          ticker: position.ticker,
          label: position.name,
          percentage: snapshot.totalValue > 0 ? (position.currentValue / snapshot.totalValue) * 100 : 0,
          targetPercentage: targetByTicker.get(position.ticker) ?? 0,
        })),
    positions: snapshot.positions.map((position) => {
      const quantity = position.quantity ?? 0;
      const averagePrice = position.costBasis !== null && quantity > 0 ? position.costBasis / quantity : 0;
      const currentPrice = quantity > 0 ? position.currentValue / quantity : 0;
      const gain = position.costBasis === null ? 0 : position.currentValue - position.costBasis;
      return {
        id: position.assetId,
        ticker: position.ticker,
        name: position.name,
        shares: position.quantity,
        averagePrice,
        currentPrice,
        currentValue: position.currentValue,
        gain,
        gainPercentage: position.costBasis && position.costBasis > 0 ? (gain / position.costBasis) * 100 : 0,
        dailyChangePercentage: null,
      };
    }),
    funds: [],
  };
}
