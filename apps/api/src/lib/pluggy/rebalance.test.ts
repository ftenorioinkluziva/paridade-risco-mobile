import assert from "node:assert/strict";
import test from "node:test";

import type { ActiveBasket } from "@paridade-risco/shared";
import type { PortfolioProviderSnapshot } from "@/lib/portfolio-provider";
import { buildPluggyRebalancePreview, toRawPositions } from "./rebalance-rules";

const basket: ActiveBasket = {
  id: "basket-1",
  name: "Cesta teste",
  allocations: [
    { targetPercentage: 50, asset: { ticker: "BOVA11", name: "BOVA11" } },
    { targetPercentage: 50, asset: { ticker: "IMAB11", name: "IMAB11" } },
  ],
};

const provider = (input: Partial<PortfolioProviderSnapshot>): PortfolioProviderSnapshot => ({
  source: "PLUGGY",
  observedAt: new Date(),
  totalValue: 200,
  investedValue: 200,
  cashBalance: 100,
  outsideStrategyValue: 0,
  outsideStrategyCount: 0,
  unresolvedValue: 0,
  unresolvedCount: 0,
  positions: [],
  warnings: [],
  ...input,
});

test("aggregates multiple provider positions for the same strategic asset", () => {
  const positions = toRawPositions(provider({
    investedValue: 300,
    positions: [
      { providerPositionId: "p1", assetId: "a1", ticker: "BOVA11", name: "BOVA11", type: "ETF", quantity: 1, currentValue: 100, costBasis: 90, observedAt: new Date() },
      { providerPositionId: "p2", assetId: "a1", ticker: "BOVA11", name: "BOVA11", type: "ETF", quantity: 2, currentValue: 200, costBasis: 180, observedAt: new Date() },
    ],
  }));

  assert.equal(positions.length, 1);
  assert.equal(positions[0]?.shares, 3);
  assert.equal(positions[0]?.currentValue, 300);
  assert.equal(positions[0]?.currentPrice, 100);
});

test("reports sufficient liquidity when calculated purchases fit bank cash", () => {
  const result = buildPluggyRebalancePreview({
    provider: provider({
      positions: [{ providerPositionId: "p1", assetId: "a1", ticker: "BOVA11", name: "BOVA11", type: "ETF", quantity: 1, currentValue: 200, costBasis: 200, observedAt: new Date() }],
      cashBalance: 100,
    }),
    basket,
    eligibleForRebalance: true,
    missingProfileFields: [],
  });

  assert.equal(result.liquidityStatus, "SUFICIENTE");
  assert.equal(result.executionReady, true);
  assert.equal(result.cashAvailable, 100);
  assert.equal(result.cashForOrders, 100);
  assert.equal(result.cashHeldInReserve, 0);
  assert.equal(result.calculationBaseValue, 300);
  assert.equal(result.buyRequired, 150);
  assert.equal(result.sellProceeds, 50);
  assert.equal(result.postRebalanceCash, 0);
});

test("uses only the user-selected cash amount for the calculation", () => {
  const result = buildPluggyRebalancePreview({
    provider: provider({
      positions: [{ providerPositionId: "p1", assetId: "a1", ticker: "BOVA11", name: "BOVA11", type: "ETF", quantity: 1, currentValue: 200, costBasis: 200, observedAt: new Date() }],
      cashBalance: 100,
    }),
    basket,
    cashForOrders: 25,
    eligibleForRebalance: true,
    missingProfileFields: [],
  });

  assert.equal(result.cashAvailable, 100);
  assert.equal(result.cashForOrders, 25);
  assert.equal(result.cashHeldInReserve, 75);
  assert.equal(result.calculationBaseValue, 225);
  assert.equal(result.postRebalanceCash, 0);
});

test("uses the latest BTG price to estimate the number of units", () => {
  const result = buildPluggyRebalancePreview({
    provider: provider({
      investedValue: 100,
      positions: [{ providerPositionId: "p1", assetId: "a1", ticker: "BOVA11", name: "BOVA11", type: "ETF", quantity: 2, currentValue: 100, costBasis: 100, observedAt: new Date() }],
      cashBalance: 100,
      livePricesByTicker: { IMAB11: 10 },
    }),
    basket,
    eligibleForRebalance: true,
    missingProfileFields: [],
  });

  const imabAction = result.actions.find((action) => action.ticker === "IMAB11");
  assert.equal(imabAction?.currentPrice, 10);
  assert.equal(imabAction?.estimatedQuantity, 10);
});

test("blocks readiness when liquidity is insufficient or positions are unmapped", () => {
  const result = buildPluggyRebalancePreview({
    provider: provider({
      positions: [{ providerPositionId: "p1", assetId: "a1", ticker: "OUTRO", name: "Ativo fora da cesta", type: "OUTRO", quantity: 1, currentValue: 200, costBasis: 200, observedAt: new Date() }],
      cashBalance: 0,
      warnings: ["1 investimento(s) Pluggy sem mapeamento estratégico não entraram nas posições"],
    }),
    basket,
    eligibleForRebalance: true,
    missingProfileFields: [],
  });

  assert.equal(result.liquidityStatus, "INSUFICIENTE");
  assert.equal(result.executionReady, false);
  assert.ok(result.warnings.some((warning) => warning.includes("não cobre")));
});

test("keeps outside-strategy value visible without using it in basket orders", () => {
  const result = buildPluggyRebalancePreview({
    provider: provider({
      investedValue: 100,
      outsideStrategyValue: 100,
      outsideStrategyCount: 1,
      positions: [{ providerPositionId: "p1", assetId: "a1", ticker: "BOVA11", name: "BOVA11", type: "ETF", quantity: 1, currentValue: 100, costBasis: 100, observedAt: new Date() }],
      cashBalance: 100,
    }),
    basket: { id: "basket-1", name: "Cesta BOVA", allocations: [{ targetPercentage: 100, asset: { ticker: "BOVA11", name: "BOVA11" } }] },
    eligibleForRebalance: true,
    missingProfileFields: [],
  });

  assert.equal(result.analysisStatus, "COMPLETA");
  assert.equal(result.mappingCoveragePercentage, 50);
  assert.equal(result.outsideStrategyValue, 100);
  assert.equal(result.actions.length, 1);
  assert.equal(result.executionReady, true);
  assert.ok(result.warnings.some((warning) => warning.includes("fora da estratégia")));
});

test("blocks actionable orders when Pluggy freshness is stale", () => {
  const result = buildPluggyRebalancePreview({
    provider: provider({
      freshness: { status: "STALE", latestObservedAt: new Date().toISOString(), latestSyncAt: new Date(0).toISOString(), ageMinutes: 180 },
      positions: [{ providerPositionId: "p1", assetId: "a1", ticker: "BOVA11", name: "BOVA11", type: "ETF", quantity: 1, currentValue: 100, costBasis: 100, observedAt: new Date() }],
      cashBalance: 100,
    }),
    basket,
    eligibleForRebalance: true,
    missingProfileFields: [],
  });

  assert.equal(result.actions.length, 0);
  assert.equal(result.executionReady, false);
  assert.ok(result.warnings.some((warning) => warning.includes("Dados Pluggy STALE")));
});

test("exposes a readable reason for every actionable order", () => {
  const result = buildPluggyRebalancePreview({
    provider: provider({
      positions: [{ providerPositionId: "p1", assetId: "a1", ticker: "BOVA11", name: "BOVA11", type: "ETF", quantity: 1, currentValue: 200, costBasis: 200, observedAt: new Date() }],
      cashBalance: 100,
    }),
    basket,
    eligibleForRebalance: true,
    missingProfileFields: [],
  });

  assert.ok(result.actions.every((action) => action.reason.length > 10));
});
