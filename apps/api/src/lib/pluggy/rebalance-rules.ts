import {
  buildRebalancePreview,
  type ActiveBasket,
  type RawPosition,
} from "@paridade-risco/shared";

import type { PortfolioProviderSnapshot } from "@/lib/portfolio-provider";

export type PluggyLiquidityStatus = "SUFICIENTE" | "INSUFICIENTE" | "NAO_CALCULADA";

export interface PluggyRebalanceRulesInput {
  provider: PortfolioProviderSnapshot;
  basket: ActiveBasket | null;
  eligibleForRebalance: boolean;
  missingProfileFields: string[];
  cashForOrders?: number;
}

export function toRawPositions(provider: PortfolioProviderSnapshot): RawPosition[] {
  const positionMap = new Map<string, RawPosition>();

  for (const position of provider.positions) {
    const current = positionMap.get(position.assetId) ?? {
      assetId: position.assetId,
      ticker: position.ticker,
      name: position.name,
      shares: 0,
      costBasis: 0,
      currentPrice: 0,
      currentValue: 0,
      dailyChangePercentage: null,
      allocationPercentage: 0,
    };
    if (position.quantity !== null) current.shares += position.quantity;
    if (position.costBasis !== null) current.costBasis += position.costBasis;
    current.currentValue += position.currentValue;
    positionMap.set(position.assetId, current);
  }

  const positions = Array.from(positionMap.values());
  for (const position of positions) {
    position.currentPrice = position.shares > 0 ? position.currentValue / position.shares : 0;
    position.allocationPercentage = provider.investedValue > 0
      ? (position.currentValue / provider.investedValue) * 100
      : 0;
  }
  return positions.sort((left, right) => right.currentValue - left.currentValue);
}

export function buildPluggyRebalancePreview(input: PluggyRebalanceRulesInput) {
  const positions = toRawPositions(input.provider);
  const maximumCashForOrders = Math.max(0, input.provider.cashBalance);
  const requestedCashForOrders = Number.isFinite(input.cashForOrders) ? input.cashForOrders as number : maximumCashForOrders;
  const cashForOrders = Math.round(Math.min(maximumCashForOrders, Math.max(0, requestedCashForOrders)) * 100) / 100;
  const cashHeldInReserve = Math.round((maximumCashForOrders - cashForOrders) * 100) / 100;
  const calculationBaseValue = input.provider.investedValue + cashForOrders;
  const preview = buildRebalancePreview({
    basket: input.basket,
    positions,
    totalValue: calculationBaseValue,
    currentPricesByTicker: input.provider.livePricesByTicker,
  });
  const eligibleActions = input.eligibleForRebalance ? preview.actions : [];
  const buyRequired = eligibleActions
    .filter((action) => action.action === "APORTAR")
    .reduce((sum, action) => sum + action.amount, 0);
  const sellProceeds = eligibleActions
    .filter((action) => action.action === "REDUZIR")
    .reduce((sum, action) => sum + action.amount, 0);
  const postRebalanceCash = cashForOrders - buyRequired + sellProceeds;
  const liquidityStatus: PluggyLiquidityStatus = input.provider.investedValue <= 0
    ? "NAO_CALCULADA"
    : postRebalanceCash >= -0.01 ? "SUFICIENTE" : "INSUFICIENTE";
  const hasUnresolvedPositions = input.provider.unresolvedCount > 0 || input.provider.warnings.some((warning) => warning.includes("sem mapeamento") || warning.includes("aguardam decisão estratégica"));
  const observedInvestedValue = input.provider.investedValue + input.provider.outsideStrategyValue + input.provider.unresolvedValue;
  const mappingCoveragePercentage = observedInvestedValue > 0
    ? (input.provider.investedValue / observedInvestedValue) * 100
    : null;
  const warnings = [...input.provider.warnings];
  if (requestedCashForOrders > maximumCashForOrders) warnings.push("O caixa destinado às ordens foi limitado ao caixa observado");
  if (requestedCashForOrders < 0) warnings.push("O caixa destinado às ordens foi ajustado para zero");
  if (input.provider.outsideStrategyCount > 0) {
    warnings.push(`${input.provider.outsideStrategyCount} investimento(s) fora da estratégia não entram na aderência da cesta`);
  }
  if (!input.basket) warnings.push("Nenhuma cesta ativa selecionada");
  if (positions.length === 0) warnings.push("Nenhuma posição Pluggy mapeada para a cesta");
  if (!input.eligibleForRebalance) warnings.push("Perfil incompleto para rebalanceamento");
  if (liquidityStatus === "INSUFICIENTE") warnings.push("O caixa destinado às ordens não cobre os aportes calculados");

  return {
    ...preview,
    source: "PLUGGY" as const,
    portfolioValue: input.provider.investedValue,
    investedValue: input.provider.investedValue,
    cashAvailable: input.provider.cashBalance,
    cashForOrders,
    cashHeldInReserve,
    calculationBaseValue,
    rebalanceCost: buyRequired,
    buyRequired,
    sellProceeds,
    postRebalanceCash,
    includeCash: cashForOrders > 0,
    liquidityStatus,
    executionReady: Boolean(
      input.eligibleForRebalance &&
      input.basket &&
      positions.length > 0 &&
      !hasUnresolvedPositions &&
      liquidityStatus === "SUFICIENTE",
    ),
    eligibleForRebalance: input.eligibleForRebalance,
    missingProfileFields: input.missingProfileFields,
    analysisStatus: hasUnresolvedPositions ? "PARCIAL" as const : "COMPLETA" as const,
    observedInvestedValue,
    outsideStrategyValue: input.provider.outsideStrategyValue,
    unresolvedValue: input.provider.unresolvedValue,
    unresolvedCount: input.provider.unresolvedCount,
    mappingCoveragePercentage,
    warnings,
    actions: eligibleActions,
  };
}
