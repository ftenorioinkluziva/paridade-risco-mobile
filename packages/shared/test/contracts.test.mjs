import test from "node:test";
import assert from "node:assert/strict";
import { errorEnvelopeSchema, mcpErrorResult, operationCatalog, operationPath, operationToMcpTool } from "../src/contracts.mjs";

test("catalog has runtime contracts and no public credentials", () => {
  assert.equal(Object.keys(operationCatalog).length, 16);
  for (const contract of Object.values(operationCatalog)) {
    const schema = operationToMcpTool(contract).inputSchema;
    assert.equal(schema.additionalProperties, false);
    assert.equal(JSON.stringify(schema).match(/token|password|credential/gi), null);
  }
});

test("strict inputs reject missing, extra and incompatible payloads", () => {
  assert.throws(() => operationPath("basket_detail", {}), (e) => e.operationError.code === "INVALID_INPUT");
  assert.throws(() => operationPath("basket_detail", { basketId: "bad" }), (e) => e.operationError.code === "INVALID_INPUT");
  assert.throws(() => operationPath("portfolio_summary", { extra: true }), (e) => e.operationError.code === "INVALID_INPUT");
  assert.equal(operationPath("basket_detail", { basketId: "123e4567-e89b-42d3-a456-426614174000" }), "/api/baskets/123e4567-e89b-42d3-a456-426614174000");
  assert.equal(operationPath("get_active_basket", {}), "/api/baskets/active");
  assert.equal(operationPath("pluggy_connection_status", {}), "/api/profile/pluggy");
  assert.equal(operationPath("pluggy_trigger_sync", {}), "/api/integrations/pluggy/sync");
  assert.equal(operationPath("pluggy_source_activation_readiness", {}), "/api/integrations/pluggy/source-activation-readiness");
  assert.equal(operationPath("pluggy_migration_readiness", {}), "/api/integrations/pluggy/migration-readiness");
  assert.equal(operationPath("map_pluggy_investment", { investmentId: "inv-1", resolution: "FORA_DA_ESTRATEGIA", reason: "Reserva de emergência" }), "/api/integrations/pluggy/mappings");
  assert.equal(operationPath("pluggy_financial_overview", {}), "/api/integrations/pluggy/financial-overview");
  assert.equal(operationPath("pluggy_financial_health", { days: 30 }), "/api/integrations/pluggy/financial-health?days=30");
  assert.equal(operationPath("pluggy_rebalance_preview", { cashForOrders: 123.45 }), "/api/integrations/pluggy/rebalance/preview?cashForOrders=123.45");
  assert.throws(() => operationPath("pluggy_rebalance_preview", { cashForOrders: -1 }), (e) => e.operationError.code === "INVALID_INPUT");
  assert.throws(() => operationPath("pluggy_financial_health", { days: 0 }), (e) => e.operationError.code === "INVALID_INPUT");
  assert.throws(() => operationPath("pluggy_financial_health", { days: 366 }), (e) => e.operationError.code === "INVALID_INPUT");
});

test("mapping input and enum is represented faithfully in the MCP schema", () => {
  const schema = operationToMcpTool(operationCatalog.map_pluggy_investment).inputSchema;
  assert.equal(schema.properties.investmentId.type, "string");
  assert.deepEqual(schema.properties.resolution, { type: "string", enum: ["MAPEADO", "FORA_DA_ESTRATEGIA"] });
  assert.deepEqual(schema.required, ["investmentId"]);
});

test("planned order cash is represented as a decimal in the MCP schema", () => {
  const schema = operationToMcpTool(operationCatalog.pluggy_rebalance_preview).inputSchema;
  assert.equal(schema.properties.cashForOrders.type, "number");
  assert.equal(schema.properties.cashForOrders.minimum, 0);
  assert.deepEqual(schema.required, []);
});

test("canonical error envelope is strict", () => {
  const valid = { success: false, error: { code: "INVALID_INPUT", category: "validation", message: "Invalid", retryable: false } };
  assert.equal(errorEnvelopeSchema.parse(valid).error.code, "INVALID_INPUT");
  assert.equal(errorEnvelopeSchema.safeParse({ ...valid, extra: true }).success, false);
  assert.equal(errorEnvelopeSchema.safeParse({ success: false, error: { message: "Invalid" } }).success, false);
});

test("all operation outputs have concrete schemas that reject incompatible payloads", () => {
  const generatedAt = "2026-07-10T12:00:00.000Z";
  const freshness = { latestObservedAt: generatedAt, latestSyncAt: generatedAt };
  const financialOverview = {
    source: "PLUGGY", generatedAt, freshness,
    period: { from: generatedAt, to: generatedAt, days: 30 },
    cash: { balance: 0, availableBalance: 0, accounts: [] },
    credit: { cards: [], totalBalanceDue: 0, totalCreditLimit: 0 },
    cashFlow: {
      income: 0, otherInflows: 0, expenses: 0, bankExpenses: 0, cardSpend: 0, cardPaymentsExcluded: 0, net: 0, transactionCount: 0,
      currentMonth: { month: "2026-07", income: 0, otherInflows: 0, expenses: 0, bankExpenses: 0, cardSpend: 0, cardPaymentsExcluded: 0, net: 0, transactionCount: 0 },
      previousMonth: { month: "2026-06", income: 0, otherInflows: 0, expenses: 0, bankExpenses: 0, cardSpend: 0, cardPaymentsExcluded: 0, net: 0, transactionCount: 0 },
    },
    obligations: { items: [], upcomingTotal: 0, cashAfterUpcoming: 0, horizonDays: 30 },
    liquidityStatus: "NAO_CALCULADA", warnings: [],
  };
  const valid = {
    portfolio_summary: { totalValue: 0, positionsValue: 0, fundsValue: 0, cashBalance: 0, positionCount: 0, basketDriftPercentage: 0, unrealizedGain: 0, allocation: [], positions: [] },
    prices_status: { success: true, status: [], timestamp: "2026-07-10T12:00:00.000Z" },
    list_assets: [{ id: "a", ticker: "AAA", name: "Asset" }],
    asset_prices: [{ ticker: "AAA", name: "Asset", calculationType: "MARKET", price: 1, priceDate: "2026-07-10" }],
    list_baskets: [{ id: "b", name: "Basket", assetCount: 0, status: "ATIVA" }],
    get_active_basket: { id: "b", name: "Basket", description: "Default basket" },
    basket_detail: { id: "b", name: "Basket", status: "ATIVA", description: null, allocations: [] },
    pluggy_connection_status: { isConfigured: true, clientId: "cid", itemId: "item-123" },
    pluggy_financial_overview: financialOverview,
    pluggy_financial_health: {
      source: "PLUGGY", generatedAt, healthStatus: "INCOMPLETA", financial: financialOverview,
      loans: { dataStatus: "SEM_REGISTROS", items: [], totalOutstanding: null, totalInstallment: null, nextDueDate: null },
      indicators: { knownDebt: null, debtServiceToIncome: null, maxCardUtilization: null, cashAfterUpcomingObligations: 0, cashFlowNet: 0 }, alerts: [],
    },
    pluggy_investment_projection: { generatedAt, freshness, connections: [], accounts: [], investments: [], totals: { totalInvestedValue: 0, totalOriginalValue: null, totalProfitValue: null, byRiskBucket: {}, mappedCount: 0, suggestedCount: 0, pendingCount: 0, outsideStrategyCount: 0, missingCostBasisCount: 0 } },
    pluggy_rebalance_preview: { source: "PLUGGY", portfolioValue: 0, investedValue: 0, cashAvailable: 0, cashForOrders: 0, cashHeldInReserve: 0, calculationBaseValue: 0, rebalanceCost: 0, buyRequired: 0, sellProceeds: 0, postRebalanceCash: 0, includeCash: false, liquidityStatus: "NAO_CALCULADA", executionReady: false, eligibleForRebalance: false, missingProfileFields: [], analysisStatus: "COMPLETA", observedInvestedValue: 0, outsideStrategyValue: 0, unresolvedValue: 0, unresolvedCount: 0, mappingCoveragePercentage: null, warnings: [], driftPercentage: 0, targetBasketName: "Sem cesta ativa", actions: [] },
    pluggy_source_activation_readiness: { source: "PLUGGY", generatedAt, currentMode: "MANUAL", candidateMode: "PLUGGY", status: "BLOCKED", canActivatePluggy: false, canSwitchToPluggy: false, manualCrudStatus: "ACTIVE", manualCrud: { transactions: "ACTIVE", funds: "ACTIVE", reason: "Revisão necessária" }, reconciliation: { status: "DIVERGENTE", considered: false, baseline: "PLUGGY_ONLY_SANDBOX" }, comparison: { status: "DIVERGENTE", totalValueDelta: 0, investedValueDelta: 0, cashBalanceDelta: 0, positionValueDelta: 0, byTicker: [] }, blockers: [], warnings: [], nextAction: "Revisar" },
    pluggy_migration_readiness: { source: "PLUGGY", generatedAt, currentMode: "MANUAL", candidateMode: "PLUGGY", status: "BLOCKED", canActivatePluggy: false, canSwitchToPluggy: false, manualCrudStatus: "ACTIVE", manualCrud: { transactions: "ACTIVE", funds: "ACTIVE", reason: "Revisão necessária" }, reconciliation: { status: "DIVERGENTE", considered: false, baseline: "PLUGGY_ONLY_SANDBOX" }, comparison: { status: "DIVERGENTE", totalValueDelta: 0, investedValueDelta: 0, cashBalanceDelta: 0, positionValueDelta: 0, byTicker: [] }, blockers: [], warnings: [], nextAction: "Revisar" },
    pluggy_trigger_sync: { source: "PLUGGY", sync: { syncRunId: "run-1", accounts: 2, investments: 5, transactions: 10 } },
    map_pluggy_investment: { id: "map-1", investmentId: "inv-1", assetId: "asset-1", status: "MAPEADO" },
  };
  for (const [name, contract] of Object.entries(operationCatalog)) {
    assert.equal(contract.outputSchema.safeParse(valid[name]).success, true, `${name} valid fixture`);
    assert.equal(contract.outputSchema.safeParse({ incompatible: true }).success, false, `${name} rejects incompatible output`);
  }
});

test("MCP error translation preserves the original canonical code", () => {
  const result = mcpErrorResult({ code: "FORBIDDEN", category: "authorization", message: "Denied", retryable: false }, { code: "OPERATION_FAILED", category: "upstream", retryable: true });
  const payload = JSON.parse(result.content[0].text);
  assert.equal(payload.error.code, "FORBIDDEN");
  assert.equal(payload.error.category, "authorization");
  assert.equal(payload.error.retryable, false);
});
