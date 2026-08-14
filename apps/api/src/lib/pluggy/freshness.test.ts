import assert from "node:assert/strict";
import test from "node:test";

import { buildPluggyFreshness } from "./freshness-rules";

const now = new Date("2026-08-04T12:00:00.000Z");

test("marks a successful recent sync as fresh", () => {
  const result = buildPluggyFreshness({
    latestObservedAt: new Date("2026-08-04T11:59:00.000Z"),
    latestSyncAt: new Date("2026-08-04T11:30:00.000Z"),
    latestSyncStatus: "SUCCEEDED",
    now,
  });

  assert.equal(result.status, "FRESH");
  assert.equal(result.ageMinutes, 30);
});

test("marks old or failed syncs as stale and missing sync as unavailable", () => {
  assert.equal(buildPluggyFreshness({
    latestObservedAt: new Date("2026-08-04T08:00:00.000Z"),
    latestSyncAt: new Date("2026-08-04T08:00:00.000Z"),
    latestSyncStatus: "SUCCEEDED",
    now,
  }).status, "STALE");
  assert.equal(buildPluggyFreshness({
    latestObservedAt: new Date("2026-08-04T11:59:00.000Z"),
    latestSyncAt: new Date("2026-08-04T11:59:00.000Z"),
    latestSyncStatus: "FAILED",
    now,
  }).status, "STALE");
  assert.equal(buildPluggyFreshness({
    latestObservedAt: null,
    latestSyncAt: null,
    latestSyncStatus: null,
    now,
  }).status, "UNAVAILABLE");
});
