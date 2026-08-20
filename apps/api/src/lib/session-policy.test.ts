import assert from "node:assert/strict";
import test from "node:test";

import { legacyConsumer, legacySessionEnabled } from "./session";

test("legacy session policy identifies only allowlisted consumers", () => {
  assert.equal(legacyConsumer(new Request("https://example.test", { headers: { "x-paridade-consumer": "cli" } })), "cli");
  assert.equal(legacyConsumer(new Request("https://example.test", { headers: { "x-paridade-consumer": "secret-value" } })), "unknown");
});

test("legacy session policy is deny-by-default and requires consumer rollback flags", () => {
  assert.equal(legacySessionEnabled("cli", {}), false);
  assert.equal(legacySessionEnabled("unknown", { LEGACY_SESSION_AUTH_ENABLED: "true" }), false);
  assert.equal(legacySessionEnabled("cli", { LEGACY_SESSION_AUTH_ENABLED: "true" }), false);
  assert.equal(legacySessionEnabled("cli", { LEGACY_SESSION_AUTH_ENABLED: "true", LEGACY_SESSION_AUTH_CLI_ENABLED: "true" }), true);
  assert.equal(legacySessionEnabled("telegram", { LEGACY_SESSION_AUTH_ENABLED: "true" }), false);
  assert.equal(legacySessionEnabled("telegram", { LEGACY_SESSION_AUTH_ENABLED: "true", TELEGRAM_LEGACY_SESSION_ROLLBACK_ENABLED: "true" }), true);
});
