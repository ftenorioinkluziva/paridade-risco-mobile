import assert from "node:assert/strict";
import test from "node:test";

import type { PortfolioProviderSnapshot } from "@/lib/portfolio-provider";
import { buildSourceActivationReadiness } from "./source-activation-rules";

const snapshot = (input: Partial<PortfolioProviderSnapshot>): PortfolioProviderSnapshot => ({
  source: "MANUAL",
  observedAt: null,
  totalValue: 100,
  investedValue: 80,
  cashBalance: 20,
  outsideStrategyValue: 0,
  outsideStrategyCount: 0,
  unresolvedValue: 0,
  unresolvedCount: 0,
  positions: [],
  warnings: [],
  ...input,
});

const comparison = (status: "ALINHADO" | "DIVERGENTE") => ({
  status,
  totalValueDelta: status === "ALINHADO" ? 0 : 10,
  investedValueDelta: 0,
  cashBalanceDelta: 0,
  positionValueDelta: 0,
});

test("blocks source activation while dual-read is divergent or positions are unmapped", () => {
  const result = buildSourceActivationReadiness({
    manual: snapshot({ positions: [{ providerPositionId: "m1", assetId: "a1", ticker: "BOVA11", name: "BOVA11", type: "OUTRO", quantity: 1, currentValue: 80, costBasis: 80, observedAt: null }] }),
    pluggy: snapshot({ source: "PLUGGY", totalValue: 20, investedValue: 0, cashBalance: 20, warnings: ["8 investimento(s) Pluggy sem mapeamento estratégico não entraram nas posições"] }),
    comparison: comparison("DIVERGENTE"),
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.canActivatePluggy, false);
  assert.equal(result.canSwitchToPluggy, result.canActivatePluggy);
  assert.equal(result.currentMode, "MANUAL");
  assert.equal(result.manualCrudStatus, "DISABLED");
  assert.ok(result.blockers.some((blocker) => blocker.includes("Dual-read divergente")));
  assert.ok(result.blockers.some((blocker) => blocker.includes("sem mapeamento")));
});

test("allows a reviewed activation only when both populated sources reconcile", () => {
  const position = { providerPositionId: "p1", assetId: "a1", ticker: "BOVA11", name: "BOVA11", type: "OUTRO" as const, quantity: 1, currentValue: 80, costBasis: 80, observedAt: null };
  const result = buildSourceActivationReadiness({
    manual: snapshot({ positions: [position] }),
    pluggy: snapshot({ source: "PLUGGY", positions: [position] }),
    comparison: comparison("ALINHADO"),
  });

  assert.equal(result.status, "READY");
  assert.equal(result.canActivatePluggy, true);
  assert.equal(result.manualCrud.transactions, "DISABLED");
  assert.match(result.nextAction, /ativação/);
});

test("blocks activation for a new account while Pluggy has no mapped positions", () => {
  const result = buildSourceActivationReadiness({
    manual: snapshot({ totalValue: 0, investedValue: 0, cashBalance: 0 }),
    pluggy: snapshot({ source: "PLUGGY", totalValue: 0, investedValue: 0, cashBalance: 0 }),
    comparison: comparison("ALINHADO"),
  });

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.canActivatePluggy, false);
  assert.equal(result.reconciliation.considered, false);
  assert.equal(result.reconciliation.baseline, "PLUGGY_ONLY_NEW_ACCOUNT");
  assert.ok(result.blockers.some((blocker) => blocker.includes("não possui posições")));
});

test("allows activation for a new account after Pluggy positions are mapped", () => {
  const position = { providerPositionId: "p1", assetId: "a1", ticker: "BOVA11", name: "BOVA11", type: "OUTRO" as const, quantity: 1, currentValue: 80, costBasis: 80, observedAt: null };
  const result = buildSourceActivationReadiness({
    manual: snapshot({ totalValue: 0, investedValue: 0, cashBalance: 0 }),
    pluggy: snapshot({ source: "PLUGGY", positions: [position] }),
    comparison: comparison("DIVERGENTE"),
  });

  assert.equal(result.status, "READY");
  assert.equal(result.canActivatePluggy, true);
  assert.equal(result.reconciliation.baseline, "PLUGGY_ONLY_NEW_ACCOUNT");
});

test("does not block reconciled activation for investments explicitly outside the strategy", () => {
  const position = { providerPositionId: "p1", assetId: "a1", ticker: "BOVA11", name: "BOVA11", type: "OUTRO" as const, quantity: 1, currentValue: 80, costBasis: 80, observedAt: null };
  const result = buildSourceActivationReadiness({
    manual: snapshot({ totalValue: 120, investedValue: 80, cashBalance: 40, positions: [position] }),
    pluggy: snapshot({
      source: "PLUGGY",
      totalValue: 120,
      investedValue: 80,
      cashBalance: 40,
      outsideStrategyValue: 20,
      outsideStrategyCount: 1,
      positions: [position],
    }),
    comparison: comparison("ALINHADO"),
  });

  assert.equal(result.status, "READY");
  assert.equal(result.canActivatePluggy, true);
});

test("ignores the fictional manual baseline only when sandbox policy is explicit", () => {
  const result = buildSourceActivationReadiness({
    manual: snapshot({ warnings: ["Fundos manuais estão incluídos no valor investido"] }),
    pluggy: snapshot({ source: "PLUGGY", positions: [{
      providerPositionId: "p1", assetId: "a1", ticker: "BOVA11", name: "BOVA11", type: "OUTRO",
      quantity: 1, currentValue: 80, costBasis: null, observedAt: new Date(),
    }] }),
    comparison: comparison("DIVERGENTE"),
    ignoreManualReconciliation: true,
  });

  assert.equal(result.status, "READY");
  assert.equal(result.canActivatePluggy, true);
  assert.deepEqual(result.reconciliation, {
    status: "DIVERGENTE",
    considered: false,
    baseline: "PLUGGY_ONLY_SANDBOX",
  });
  assert.ok(result.warnings.some((warning) => warning.includes("dados fictícios")));
  assert.equal(result.blockers.length, 0);
});

test("reports an active Pluggy source without hiding missing mapped positions", () => {
  const result = buildSourceActivationReadiness({
    manual: snapshot({}),
    pluggy: snapshot({ source: "PLUGGY", positions: [] }),
    comparison: comparison("DIVERGENTE"),
    currentMode: "PLUGGY",
    ignoreManualReconciliation: true,
  });

  assert.equal(result.currentMode, "PLUGGY");
  assert.equal(result.status, "BLOCKED");
  assert.match(result.nextAction, /Fonte Pluggy ativa/);
});
