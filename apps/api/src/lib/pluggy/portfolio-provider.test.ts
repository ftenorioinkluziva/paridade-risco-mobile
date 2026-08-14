import assert from "node:assert/strict";
import test from "node:test";

import type { PortfolioProviderSnapshot } from "@/lib/portfolio-provider";
import { buildDualReadComparison } from "@/lib/portfolio-dual-read-rules";

const snapshot = (input: Partial<PortfolioProviderSnapshot>): PortfolioProviderSnapshot => ({
  source: "MANUAL",
  observedAt: null,
  totalValue: 0,
  investedValue: 0,
  cashBalance: 0,
  outsideStrategyValue: 0,
  outsideStrategyCount: 0,
  unresolvedValue: 0,
  unresolvedCount: 0,
  positions: [],
  warnings: [],
  ...input,
});

test("dual-read aligns equal totals and ticker values", () => {
  const result = buildDualReadComparison({
    manual: snapshot({
      totalValue: 100,
      investedValue: 80,
      cashBalance: 20,
      positions: [{
        providerPositionId: "manual-1", assetId: "asset-1", ticker: "BOVA11", name: "BOVA11", type: "ETF",
        quantity: 1, currentValue: 80, costBasis: 75, observedAt: null,
      }],
    }),
    pluggy: snapshot({
      source: "PLUGGY", totalValue: 100, investedValue: 80, cashBalance: 20,
      positions: [{
        providerPositionId: "pluggy-1", assetId: "asset-1", ticker: "BOVA11", name: "BOVA11", type: "ETF",
        quantity: 1, currentValue: 80, costBasis: 75, observedAt: new Date(),
      }],
    }),
  });

  assert.equal(result.status, "ALINHADO");
  assert.equal(result.byTicker[0]?.status, "ALINHADO");
});

test("dual-read exposes an unexplained ticker delta", () => {
  const result = buildDualReadComparison({
    manual: snapshot({ totalValue: 100, investedValue: 100, positions: [{
      providerPositionId: "manual-1", assetId: "asset-1", ticker: "BOVA11", name: "BOVA11", type: "ETF",
      quantity: 1, currentValue: 100, costBasis: 100, observedAt: null,
    }] }),
    pluggy: snapshot({ source: "PLUGGY", totalValue: 120, investedValue: 120, positions: [{
      providerPositionId: "pluggy-2", assetId: "asset-2", ticker: "ISUS11", name: "ISUS11", type: "ETF",
      quantity: 1, currentValue: 120, costBasis: null, observedAt: new Date(),
    }] }),
  });

  assert.equal(result.status, "DIVERGENTE");
  assert.deepEqual(result.byTicker.map((item) => item.ticker), ["BOVA11", "ISUS11"]);
  assert.equal(result.byTicker.find((item) => item.ticker === "ISUS11")?.delta, 120);
});
