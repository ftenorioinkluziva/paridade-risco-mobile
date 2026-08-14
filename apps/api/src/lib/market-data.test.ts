import assert from "node:assert/strict";
import test from "node:test";

import {
  STRATEGIC_ETF_TICKERS,
  classifyMarketQuoteFreshness,
  getStrategicEtfTickersForSchedule,
  monthlyCallEstimate,
  toYahooTicker,
} from "@/lib/market-data";

test("mantém exatamente a cesta estratégica de ETFs", () => {
  assert.deepEqual([...STRATEGIC_ETF_TICKERS], [
    "B5P211", "BOVA11", "BOVV11", "DOLA11", "FIXA11", "IB5M11",
    "IMAB11", "IRFM11", "LFTS11", "SMAL11", "SPXI11", "XFIX11",
  ]);
  assert.equal(STRATEGIC_ETF_TICKERS.length, 12);
});

test("converte tickers B3 para o formato Yahoo", () => {
  assert.equal(toYahooTicker("BOVA11"), "BOVA11.SA");
  assert.equal(toYahooTicker("bova11.sa"), "BOVA11.SA");
});

test("abre renda fixa às 10:00 e renda variável às 10:05", () => {
  const fixedWindow = getStrategicEtfTickersForSchedule(new Date("2026-08-14T13:00:00.000Z"));
  const fullWindow = getStrategicEtfTickersForSchedule(new Date("2026-08-14T13:05:00.000Z"));
  assert.ok(fixedWindow.length > 0);
  assert.ok(!fixedWindow.includes("BOVA11"));
  assert.equal(fullWindow.length, 12);
  assert.ok(fullWindow.includes("BOVA11"));
});

test("estima 11.088 chamadas mensais com intervalo de 10 minutos", () => {
  assert.equal(monthlyCallEstimate(), 11_088);
});

test("classifica cotação sem observação como indisponível e antiga como desatualizada", () => {
  const now = new Date("2026-08-14T15:00:00.000Z");
  assert.equal(classifyMarketQuoteFreshness(null, now), "UNAVAILABLE");
  assert.equal(classifyMarketQuoteFreshness(new Date("2026-08-14T12:30:00.000Z"), now), "STALE");
});
