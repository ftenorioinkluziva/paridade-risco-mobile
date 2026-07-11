import test from "node:test";
import assert from "node:assert/strict";
import { errorEnvelopeSchema, mcpErrorResult, operationCatalog, operationPath, operationToMcpTool } from "../src/contracts.mjs";

test("catalog has runtime contracts and no public credentials", () => {
  assert.equal(Object.keys(operationCatalog).length, 9);
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
  assert.equal(operationPath("transaction_history", {}), "/api/transactions");
  assert.equal(operationPath("transaction_history", { limit: 20 }), "/api/transactions?limit=20");
  assert.throws(() => operationPath("transaction_history", { limit: 0 }), (e) => e.operationError.code === "INVALID_INPUT");
  assert.throws(() => operationPath("transaction_history", { limit: 101 }), (e) => e.operationError.code === "INVALID_INPUT");
});

test("transaction limit is represented faithfully in the MCP schema", () => {
  const schema = operationToMcpTool(operationCatalog.transaction_history).inputSchema;
  assert.deepEqual(schema.properties.limit, { type: "integer", minimum: 1, maximum: 100 });
  assert.deepEqual(schema.required, []);
});

test("canonical error envelope is strict", () => {
  const valid = { success: false, error: { code: "INVALID_INPUT", category: "validation", message: "Invalid", retryable: false } };
  assert.equal(errorEnvelopeSchema.parse(valid).error.code, "INVALID_INPUT");
  assert.equal(errorEnvelopeSchema.safeParse({ ...valid, extra: true }).success, false);
  assert.equal(errorEnvelopeSchema.safeParse({ success: false, error: { message: "Invalid" } }).success, false);
});

test("all operation outputs have concrete schemas that reject incompatible payloads", () => {
  const valid = {
    portfolio_summary: { totalValue: 0, positionsValue: 0, fundsValue: 0, cashBalance: 0, positionCount: 0, basketDriftPercentage: 0, unrealizedGain: 0, allocation: [], positions: [] },
    prices_status: { success: true, status: [], timestamp: "2026-07-10T12:00:00.000Z" },
    rebalance_preview: { portfolioValue: 0, driftPercentage: 0, targetBasketName: "Sem cesta", actions: [] },
    list_assets: [{ id: "a", ticker: "AAA", name: "Asset" }],
    asset_prices: [{ ticker: "AAA", name: "Asset", calculationType: "MARKET", price: 1, priceDate: "2026-07-10" }],
    funds_summary: [{ currentValue: 1, id: "f", indexAssetName: null, indexAssetTicker: null, initialInvestment: 1, investmentDate: "2026-07-10T12:00:00.000Z", name: "Fund", updatedAt: "2026-07-10T12:00:00.000Z" }],
    list_baskets: [{ id: "b", name: "Basket", assetCount: 0, status: "ATIVA" }],
    basket_detail: { id: "b", name: "Basket", status: "ATIVA", description: null, allocations: [] },
    transaction_history: [{ id: "t", assetTicker: "AAA", assetName: "Asset", type: "COMPRA", shares: 1, pricePerShare: 2, amount: 2, tradedAt: "2026-07-10T12:00:00.000Z", dateLabel: "10 jul" }],
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
