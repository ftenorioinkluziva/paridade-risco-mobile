import assert from "node:assert/strict";
import test from "node:test";

import { legacyConsumer, legacySessionEnabled } from "./session";

test("legacy session policy identifies only allowlisted consumers", () => {
  assert.equal(legacyConsumer(new Request("https://example.test", { headers: { "x-paridade-consumer": "cli" } })), "cli");
  assert.equal(legacyConsumer(new Request("https://example.test", { headers: { "x-paridade-consumer": "secret-value" } })), "unknown");
});

test("legacy session policy supports global and CLI-specific kill switches", () => {
  assert.equal(legacySessionEnabled("cli", {}), true);
  assert.equal(legacySessionEnabled("cli", { LEGACY_SESSION_AUTH_CLI_ENABLED: "false" }), false);
  assert.equal(legacySessionEnabled("telegram", { LEGACY_SESSION_AUTH_CLI_ENABLED: "false" }), true);
  assert.equal(legacySessionEnabled("telegram", { LEGACY_SESSION_AUTH_ENABLED: "false" }), false);
});
