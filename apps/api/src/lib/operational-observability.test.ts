import assert from "node:assert/strict";
import test from "node:test";

import {
  buildQuoteQuotaSnapshot,
  classifyPluggyOperationalError,
  operationalCorrelationId,
  sanitizeOperationalFields,
} from "./operational-observability";

test("quota snapshot exposes observed calls, projection, margin and status", () => {
  const snapshot = buildQuoteQuotaSnapshot({
    observedCalls: 12_000,
    monthlyQuota: 15_000,
    tradingDays: 25,
    intervalMinutes: 7,
    tickers: 9,
  });

  assert.equal(snapshot.estimatedCalls, 14_175);
  assert.equal(snapshot.remainingCalls, 3_000);
  assert.equal(snapshot.projectedMargin, 825);
  assert.equal(snapshot.status, "HEALTHY");
});

test("quota snapshot signals exhausted and near-limit budgets", () => {
  assert.equal(buildQuoteQuotaSnapshot({ observedCalls: 13_600 }).status, "NEAR_LIMIT");
  assert.equal(buildQuoteQuotaSnapshot({ observedCalls: 15_000 }).status, "LIMIT_REACHED");
});

test("operational fields redact sensitive values and cap strings", () => {
  const sanitized = sanitizeOperationalFields({
    correlationId: "abc",
    apiKey: "do-not-log",
    payload: { secret: "do-not-log" },
    quota: { remainingCalls: 800, clientSecret: "do-not-log" },
    message: "x".repeat(200),
  });

  assert.equal(sanitized.apiKey, "[redacted]");
  assert.equal(sanitized.payload, "[redacted]");
  assert.deepEqual(sanitized.quota, { remainingCalls: 800, clientSecret: "[redacted]" });
  assert.equal((sanitized.message as string).length, 120);
});

test("correlation id is stable without exposing source identifiers", () => {
  const first = operationalCorrelationId("user-secret", "item-secret");
  const second = operationalCorrelationId("user-secret", "item-secret");

  assert.equal(first, second);
  assert.equal(first.length, 12);
  assert.ok(!first.includes("user-secret"));
});

test("Pluggy operational categories distinguish quota, transient, unavailable and stale", () => {
  assert.equal(classifyPluggyOperationalError({ status: 429 }), "QUOTA_LIMIT");
  assert.equal(classifyPluggyOperationalError({ status: 503 }), "UNAVAILABLE");
  assert.equal(classifyPluggyOperationalError({ status: 408 }), "TRANSIENT_FAILURE");
  assert.equal(classifyPluggyOperationalError({ stale: true }), "STALE");
});
