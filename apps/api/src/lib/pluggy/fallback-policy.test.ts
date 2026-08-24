import assert from "node:assert/strict";
import test from "node:test";

import { isPluggyFallbackDue } from "./fallback-policy";

test("skips a successful Pluggy item while it is inside the 30 minute window", () => {
  const now = new Date("2026-08-24T18:30:00.000Z");
  assert.equal(isPluggyFallbackDue({
    lastSyncAt: new Date("2026-08-24T18:05:00.000Z"),
    lastSyncStatus: "SUCCEEDED",
    now,
  }), false);
});

test("runs fallback for missing, failed or expired syncs", () => {
  const now = new Date("2026-08-24T18:30:00.000Z");
  assert.equal(isPluggyFallbackDue({ lastSyncAt: null, lastSyncStatus: null, now }), true);
  assert.equal(isPluggyFallbackDue({ lastSyncAt: new Date("2026-08-24T18:20:00.000Z"), lastSyncStatus: "FAILED", now }), true);
  assert.equal(isPluggyFallbackDue({ lastSyncAt: new Date("2026-08-24T17:59:00.000Z"), lastSyncStatus: "SUCCEEDED", now }), true);
});
