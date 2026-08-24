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
    "B5P211", "BOVA11", "DOLA11", "FIXA11", "IB5M11",
    "IMAB11", "IRFM11", "LFTS11", "XFIX11",
  ]);
  assert.equal(STRATEGIC_ETF_TICKERS.length, 9);
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
  assert.equal(fullWindow.length, 9);
  assert.ok(fullWindow.includes("BOVA11"));
});

test("estima 12.474 chamadas mensais em 22 sessões com intervalo de 7 minutos", () => {
  assert.equal(monthlyCallEstimate(), 12_474);
  assert.equal(monthlyCallEstimate({ tradingDays: 25 }), 14_175);
});

test("classifica cotação sem observação como indisponível e antiga como desatualizada", () => {
  const now = new Date("2026-08-14T15:00:00.000Z");
  assert.equal(classifyMarketQuoteFreshness(null, now), "UNAVAILABLE");
  assert.equal(classifyMarketQuoteFreshness(new Date("2026-08-14T12:30:00.000Z"), now), "STALE");
});
