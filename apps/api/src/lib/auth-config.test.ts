import assert from "node:assert/strict";
import test from "node:test";

import { requireAuthSecret } from "./auth-config";

test("requires an explicitly configured authentication secret", () => {
  assert.throws(() => requireAuthSecret({}), /must be configured/);
  assert.throws(() => requireAuthSecret({ BETTER_AUTH_SECRET: "too-short" }), /at least 32/);
});

test("prefers BETTER_AUTH_SECRET and accepts NEXTAUTH_SECRET compatibility", () => {
  const preferred = "a".repeat(32);
  const compatible = "b".repeat(32);

  assert.equal(requireAuthSecret({ BETTER_AUTH_SECRET: preferred, NEXTAUTH_SECRET: compatible }), preferred);
  assert.equal(requireAuthSecret({ NEXTAUTH_SECRET: compatible }), compatible);
});
