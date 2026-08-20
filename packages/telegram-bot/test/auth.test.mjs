import assert from "node:assert/strict";
import test from "node:test";

import { chatReference, signedTelegramHeaders, telegramScopeForPath } from "../src/auth.mjs";

const secret = "test-telegram-s2s-secret-with-32-characters";

test("creates deterministic, scoped request authentication without query credentials", () => {
  const headers = signedTelegramHeaders({
    path: "/api/profile?ignored=true",
    chatId: "123456",
    secret,
    timestamp: 1_700_000_000,
    nonce: "abcdefghijklmnop",
  });
  assert.equal(headers["x-telegram-scope"], "profile:read");
  assert.match(headers["x-telegram-signature"], /^v1=[a-f0-9]{64}$/);
  assert.equal(headers.authorization, undefined);
  assert.ok(!JSON.stringify(headers).includes("ignored=true"));
});

test("rejects an unmapped route and hashes audit identity", () => {
  assert.equal(telegramScopeForPath("/api/admin"), null);
  assert.throws(() => signedTelegramHeaders({ path: "/api/admin", chatId: "1", secret }));
  assert.match(chatReference("123456"), /^[a-f0-9]{12}$/);
  assert.ok(!chatReference("123456").includes("123456"));
});
