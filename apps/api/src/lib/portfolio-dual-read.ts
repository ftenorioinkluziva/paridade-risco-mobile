import { getPortfolioSnapshot } from "@/lib/portfolio";
import type {
  PortfolioProvider,
  PortfolioProviderSnapshot,
} from "@/lib/portfolio-provider";
import { createPluggyPortfolioProvider } from "@/lib/pluggy/portfolio-provider";
import { buildDualReadComparison } from "@/lib/portfolio-dual-read-rules";

export { buildDualReadComparison } from "@/lib/portfolio-dual-read-rules";

const VALUE_TOLERANCE = 0.01;

export function buildManualPortfolioSnapshot(input: Awaited<ReturnType<typeof getPortfolioSnapshot>>): PortfolioProviderSnapshot {
  const warnings = input.fundsValue > VALUE_TOLERANCE
    ? ["Fundos manuais estão incluídos no valor investido, mas não possuem detalhe de posição neste contrato"]
    : [];

  return {
    source: "MANUAL",
    observedAt: null,
    totalValue: input.totalValue,
    investedValue: input.positionsValue + input.fundsValue,
    cashBalance: input.cashBalance,
    outsideStrategyValue: 0,
    outsideStrategyCount: 0,
    unresolvedValue: 0,
    unresolvedCount: 0,
    positions: input.positions.map((position) => ({
      providerPositionId: position.assetId,
      assetId: position.assetId,
      ticker: position.ticker,
      name: position.name,
      type: "OUTRO",
      quantity: position.shares,
      currentValue: position.currentValue,
      costBasis: position.costBasis,
      observedAt: null,
    })),
    warnings,
  };
}

export function createManualPortfolioProvider(): PortfolioProvider {
  return {
    source: "MANUAL",
    getSnapshot: async (userId) => buildManualPortfolioSnapshot(await getPortfolioSnapshot(userId)),
  };
}

export async function getPortfolioDualRead(userId: string) {
  const manualProvider = createManualPortfolioProvider();
  const pluggyProvider = createPluggyPortfolioProvider();
  const [manual, pluggy] = await Promise.all([
    manualProvider.getSnapshot(userId),
    pluggyProvider.getSnapshot(userId),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    manual,
    pluggy,
    comparison: buildDualReadComparison({ manual, pluggy }),
  };
}
