import assert from "node:assert/strict";
import test from "node:test";
import { classifyExternalError, parseBCBResponse, parseYahooResponse, readExternalJson } from "./external-financial-response";

const codeOf = (error: unknown) => (error as { operationError?: { code?: string } }).operationError?.code;

test("valid provider fixtures pass runtime validation", () => {
  assert.equal(parseYahooResponse({ chart: { result: [{ timestamp: [1], indicators: { quote: [{ close: [10.5] }] } }], error: null } }).chart.result?.length, 1);
  assert.equal(parseYahooResponse({ chart: { result: [{ meta: { currency: "BRL" }, timestamp: [1], indicators: { quote: [{ open: [10], high: [11], low: [9], close: [10.5], volume: [100] }] } }], error: null } }).chart.result?.[0]?.indicators.quote[0].close[0], 10.5);
  assert.equal(parseBCBResponse([{ valor: "0,12", data: "10/07/2026" }]).length, 1);
});

test("missing or incompatible provider fields are rejected", () => {
  assert.throws(() => parseYahooResponse({ chart: { result: [{}], error: null } }), (error) => codeOf(error) === "UPSTREAM_SCHEMA_INVALID");
  assert.throws(() => parseBCBResponse([{ valor: "secret payload", data: "today" }]), (error) => codeOf(error) === "UPSTREAM_SCHEMA_INVALID");
});

test("external response reader rejects HTML and truncated JSON without exposing the body", async () => {
  await assert.rejects(() => readExternalJson(new Response("<html>sensitive</html>", { headers: { "content-type": "text/html" } }), "BCB"), (error) => codeOf(error) === "UPSTREAM_CONTENT_TYPE_INVALID" && !(error as Error).message.includes("sensitive"));
  await assert.rejects(() => readExternalJson(new Response('{"valor":', { headers: { "content-type": "application/json" } }), "BCB"), (error) => codeOf(error) === "UPSTREAM_JSON_INVALID");
});

test("external timeout is retryable and distinct from schema failures", () => {
  const timeout = new DOMException("timed out", "TimeoutError");
  assert.equal(codeOf(classifyExternalError(timeout, "BCB")), "UPSTREAM_TIMEOUT");
  assert.equal((classifyExternalError(timeout, "BCB") as { operationError: { retryable: boolean } }).operationError.retryable, true);
});
