import assert from "node:assert/strict";
import test from "node:test";

import { signTelegramRequest, TelegramNonceStore, TELEGRAM_HEADERS, verifyTelegramRequest } from "./telegram-s2s-contract";

const currentSecret = "current-telegram-s2s-secret-with-32-characters";
const previousSecret = "previous-telegram-s2s-secret-with-32-characters";
const now = 1_700_000_000;

function request(overrides: { secret?: string; timestamp?: number; nonce?: string; scope?: string; signature?: string } = {}) {
  const input = {
    method: "GET",
    pathname: "/api/profile",
    chatId: "123456",
    timestamp: String(overrides.timestamp ?? now),
    nonce: overrides.nonce ?? "abcdefghijklmnop",
    scope: overrides.scope ?? "profile:read",
  };
  const signature = overrides.signature ?? signTelegramRequest(overrides.secret ?? currentSecret, input);
  return new Request(`https://example.test${input.pathname}`, { headers: {
    [TELEGRAM_HEADERS.chatId]: input.chatId,
    [TELEGRAM_HEADERS.timestamp]: input.timestamp,
    [TELEGRAM_HEADERS.nonce]: input.nonce,
    [TELEGRAM_HEADERS.scope]: input.scope,
    [TELEGRAM_HEADERS.signature]: signature,
  } });
}

function verify(input: Request, options = {}) {
  return verifyTelegramRequest(input, { currentSecret, previousSecret, now, nonceStore: new TelegramNonceStore(), ...options });
}

test("accepts the current and previous rotation secrets", () => {
  assert.deepEqual(verify(request()).valid, true);
  const result = verify(request({ secret: previousSecret }));
  assert.deepEqual(result, { valid: true, chatId: "123456", scope: "profile:read", keyVersion: "previous" });
});

test("denies invalid signature, expired timestamp, insufficient scope and revocation", () => {
  assert.deepEqual(verify(request({ signature: "v1=invalid" })), { valid: false, reason: "invalid_signature" });
  assert.deepEqual(verify(request({ timestamp: now - 61 })), { valid: false, reason: "expired_request" });
  assert.deepEqual(verify(request({ scope: "portfolio:read" })), { valid: false, reason: "insufficient_scope" });
  assert.deepEqual(verify(request(), { enabled: false }), { valid: false, reason: "disabled" });
});

test("denies a replay after the first valid request", () => {
  const nonceStore = new TelegramNonceStore();
  const signed = request();
  const options = { currentSecret, now, nonceStore };
  assert.equal(verifyTelegramRequest(signed, options).valid, true);
  assert.deepEqual(verifyTelegramRequest(signed, options), { valid: false, reason: "replay" });
});
