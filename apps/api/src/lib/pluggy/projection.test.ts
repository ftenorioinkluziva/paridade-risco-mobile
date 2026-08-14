import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyPluggyInvestment,
  findMappingCandidate,
  resolvePluggyMappingStatus,
} from "./projection-rules";

test("classifies common Pluggy investment descriptions into risk buckets", () => {
  assert.equal(classifyPluggyInvestment({ type: "ETF", name: "ETF global" }).riskBucket, "ETF");
  assert.equal(classifyPluggyInvestment({ type: "FIXED_INCOME", subtype: "CDB" }).riskBucket, "RENDA_FIXA");
  assert.equal(classifyPluggyInvestment({ name: "Bitcoin" }).riskBucket, "CRYPTO");
  assert.equal(classifyPluggyInvestment({ name: "Ouro" }).riskBucket, "COMMODITY");
  assert.equal(classifyPluggyInvestment({ type: "CASH" }).riskBucket, "CAIXA");
  assert.equal(classifyPluggyInvestment({ type: "EQUITY", name: "Ação" }).riskBucket, "OUTRO");
});

test("keeps mapping state pending or suggested without inventing an explicit mapping", () => {
  assert.equal(classifyPluggyInvestment({ code: "BOVA11" }).mappingStatus, "PENDENTE");
  assert.equal(classifyPluggyInvestment({ code: "BOVA11", hasMappingCandidate: true }).mappingStatus, "SUGERIDO");
});

test("promotes only an explicitly persisted link to mapped", () => {
  assert.equal(resolvePluggyMappingStatus({ hasPersistedMapping: true, hasMappingCandidate: false }), "MAPEADO");
  assert.equal(resolvePluggyMappingStatus({ hasPersistedMapping: true, hasMappingCandidate: true }), "MAPEADO");
  assert.equal(resolvePluggyMappingStatus({ hasPersistedMapping: false, hasMappingCandidate: true }), "SUGERIDO");
  assert.equal(resolvePluggyMappingStatus({ hasPersistedMapping: false, hasMappingCandidate: false }), "PENDENTE");
});

test("preserves an explicit outside-strategy decision without inventing an asset link", () => {
  assert.equal(resolvePluggyMappingStatus({
    hasPersistedMapping: true,
    hasMappingCandidate: true,
    persistedStatus: "FORA_DA_ESTRATEGIA",
  }), "FORA_DA_ESTRATEGIA");
});

test("matches Pluggy identifiers against active local asset identifiers", () => {
  const candidate = findMappingCandidate(
    { code: "bova11", isin: null },
    [
      { id: "asset-1", ticker: "IVVB11", sourceTicker: null, name: "IVVB11", type: "ETF" },
      { id: "asset-2", ticker: "BOVA11", sourceTicker: null, name: "BOVA11", type: "ETF" },
    ],
  );

  assert.deepEqual(candidate, {
    id: "asset-2",
    ticker: "BOVA11",
    sourceTicker: null,
    name: "BOVA11",
    type: "ETF",
  });
});

test("does not classify an absent identifier as a local mapping", () => {
  assert.equal(
    findMappingCandidate({ code: null, isin: null }, [
      { id: "asset-1", ticker: "BOVA11", sourceTicker: null, name: "BOVA11", type: "ETF" },
    ]),
    null,
  );
});
