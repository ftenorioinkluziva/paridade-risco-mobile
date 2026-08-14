import assert from "node:assert/strict";
import test from "node:test";

import { fetchMarketQuote } from "@/lib/market-data-provider";

const originalFetch = globalThis.fetch;
const originalToken = process.env.BRAPI_API_TOKEN;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.BRAPI_API_TOKEN;
  else process.env.BRAPI_API_TOKEN = originalToken;
});

test("usa Brapi como fonte primária sem expor o token no payload", async () => {
  process.env.BRAPI_API_TOKEN = "test-token";
  let requestedUrl = "";
  let authorization = "";
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    authorization = new Headers(init?.headers).get("authorization") ?? "";
    return jsonResponse({ results: [{ symbol: "BOVA11", regularMarketPrice: 123.45, regularMarketTime: 1_722_000_000, regularMarketChangePercent: 0.4 }] });
  };

  const quote = await fetchMarketQuote("BOVA11", new Date("2026-08-14T15:00:00.000Z"));
  assert.equal(quote.source, "BRAPI");
  assert.equal(quote.price, 123.45);
  assert.match(requestedUrl, /brapi\.dev\/api\/quote\/BOVA11$/);
  assert.equal(authorization, "Bearer test-token");
});

test("usa Yahoo Finance quando Brapi falha", async () => {
  process.env.BRAPI_API_TOKEN = "test-token";
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls += 1;
    if (calls === 1) return jsonResponse({ error: "rate limited" }, 429);
    assert.match(String(input), /BOVA11\.SA/);
    return jsonResponse({ chart: { result: [{ timestamp: [1_722_000_000], indicators: { quote: [{ close: [111.2] }] } }], error: null } });
  };

  const quote = await fetchMarketQuote("BOVA11");
  assert.equal(quote.source, "YAHOO_FINANCE");
  assert.equal(quote.price, 111.2);
  assert.equal(calls, 2);
});

test("usa Yahoo quando Brapi retorna preço sem timestamp observável", async () => {
  process.env.BRAPI_API_TOKEN = "test-token";
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls += 1;
    if (calls === 1) return jsonResponse({ results: [{ symbol: "BOVA11", regularMarketPrice: 123.45 }] });
    assert.match(String(input), /BOVA11\.SA/);
    return jsonResponse({ chart: { result: [{ timestamp: [1_722_000_000], indicators: { quote: [{ close: [111.2] }] } }], error: null } });
  };

  const quote = await fetchMarketQuote("BOVA11");
  assert.equal(quote.source, "YAHOO_FINANCE");
  assert.equal(quote.price, 111.2);
  assert.equal(calls, 2);
});
