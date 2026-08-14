import type { PortfolioProviderPosition, PortfolioProviderSnapshot } from "@/lib/portfolio-provider";

const VALUE_TOLERANCE = 0.01;

export type DualReadStatus = "ALINHADO" | "DIVERGENTE";

function byTicker(positions: PortfolioProviderPosition[]) {
  return positions.reduce<Map<string, number>>((totals, position) => {
    totals.set(position.ticker, (totals.get(position.ticker) ?? 0) + position.currentValue);
    return totals;
  }, new Map());
}

function statusForDelta(delta: number): DualReadStatus {
  return Math.abs(delta) <= VALUE_TOLERANCE ? "ALINHADO" : "DIVERGENTE";
}

export function buildDualReadComparison(input: {
  manual: PortfolioProviderSnapshot;
  pluggy: PortfolioProviderSnapshot;
}) {
  const manualByTicker = byTicker(input.manual.positions);
  const pluggyByTicker = byTicker(input.pluggy.positions);
  const tickers = Array.from(new Set([...manualByTicker.keys(), ...pluggyByTicker.keys()])).sort();
  const byTickerComparison = tickers.map((ticker) => {
    const manualValue = manualByTicker.get(ticker) ?? 0;
    const pluggyValue = pluggyByTicker.get(ticker) ?? 0;
    const delta = pluggyValue - manualValue;
    return {
      ticker,
      manualValue,
      pluggyValue,
      delta,
      status: statusForDelta(delta),
    };
  });
  const totalValueDelta = input.pluggy.totalValue - input.manual.totalValue;
  const investedValueDelta = input.pluggy.investedValue - input.manual.investedValue;
  const cashBalanceDelta = input.pluggy.cashBalance - input.manual.cashBalance;
  const manualPositionValue = Array.from(manualByTicker.values()).reduce((sum, value) => sum + value, 0);
  const pluggyPositionValue = Array.from(pluggyByTicker.values()).reduce((sum, value) => sum + value, 0);
  const positionValueDelta = pluggyPositionValue - manualPositionValue;
  const statuses = [
    statusForDelta(totalValueDelta),
    statusForDelta(investedValueDelta),
    statusForDelta(cashBalanceDelta),
    statusForDelta(positionValueDelta),
    ...byTickerComparison.map((item) => item.status),
  ];

  return {
    status: statuses.every((status) => status === "ALINHADO") ? "ALINHADO" as const : "DIVERGENTE" as const,
    totalValueDelta,
    investedValueDelta,
    cashBalanceDelta,
    positionValueDelta,
    byTicker: byTickerComparison,
  };
}
