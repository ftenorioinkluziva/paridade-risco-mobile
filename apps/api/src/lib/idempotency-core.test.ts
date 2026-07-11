import assert from "node:assert/strict";
import test from "node:test";

import { IDEMPOTENCY_KEY_PATTERN, IDEMPOTENCY_RETENTION_DAYS, hashIdempotencyPayload } from "./idempotency-core";

test("semantic object key order produces the same request hash", () => {
  assert.equal(
    hashIdempotencyPayload({ name: "Reserva", amount: 10, nested: { b: 2, a: 1 } }),
    hashIdempotencyPayload({ nested: { a: 1, b: 2 }, amount: 10, name: "Reserva" }),
  );
});

test("semantic payload changes produce a different request hash", () => {
  assert.notEqual(hashIdempotencyPayload({ amount: 10 }), hashIdempotencyPayload({ amount: 11 }));
});

test("idempotency key policy rejects unsafe and oversized values", () => {
  assert.equal(IDEMPOTENCY_KEY_PATTERN.test("retry:transaction-123"), true);
  assert.equal(IDEMPOTENCY_KEY_PATTERN.test("contains secret whitespace"), false);
  assert.equal(IDEMPOTENCY_KEY_PATTERN.test("x".repeat(129)), false);
  assert.equal(IDEMPOTENCY_RETENTION_DAYS, 30);
});
