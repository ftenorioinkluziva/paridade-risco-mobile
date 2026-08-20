import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { apiKeyStatus, classifyStoredKeyFailure, clearCredentials, configureApiKey } from "../src/index.mjs";

const SECRET = "pr_mcp_test-secret-that-must-never-leak";

function success(permission) {
  return { ok: true, status: 200, data: { valid: true, keyId: "key-1", expiresAt: "2099-01-01T00:00:00.000Z", permissions: ["read", "sync"], permission } };
}

test("configure validates minimum read and sync scopes, persists safely and removes legacy session", async () => {
  const calls = [];
  let stored;
  const config = { apiUrl: "https://api.example", sessionToken: "legacy", userId: "user-1" };
  const output = await configureApiKey({
    key: SECRET,
    config,
    request: async (_method, path, _operation, _body, context) => {
      calls.push({ path, context });
      return success(path.includes("sync") ? "sync" : "read");
    },
    save: (value) => { stored = structuredClone(value); },
  });

  assert.deepEqual(calls.map((call) => call.path), [
    "/api/auth/mcp-token/validate?permission=read",
    "/api/auth/mcp-token/validate?permission=sync",
  ]);
  assert.ok(calls.every((call) => call.context.consumer === "cli" && call.context.apiKey === SECRET));
  assert.equal(stored.apiKey, SECRET);
  assert.equal(stored.sessionToken, undefined);
  assert.equal(stored.userId, undefined);
  assert.equal(JSON.stringify(output).includes(SECRET), false);
});

test("configure refuses an insufficient scope without persisting the key", async () => {
  let saves = 0;
  await assert.rejects(() => configureApiKey({
    key: SECRET,
    config: { apiUrl: "https://api.example" },
    request: async (_method, path) => path.includes("sync")
      ? { ok: false, status: 403, error: "scope", operationError: { code: "API_KEY_INSUFFICIENT_SCOPE", category: "authorization", message: "scope", retryable: false } }
      : success("read"),
    save: () => { saves += 1; },
  }), (error) => error.operationError?.code === "API_KEY_INSUFFICIENT_SCOPE");
  assert.equal(saves, 0);
});

test("status distinguishes missing, expired and a previously verified revoked key", async () => {
  const missing = await apiKeyStatus({ config: {} });
  assert.equal(missing.operationError.code, "API_KEY_MISSING");

  const failed = { ok: false, status: 401, operationError: { code: "API_KEY_INVALID", category: "authorization", message: "invalid", retryable: false } };
  assert.equal(classifyStoredKeyFailure(failed, { apiKeyExpiresAt: "2020-01-01T00:00:00.000Z" }).operationError.code, "API_KEY_EXPIRED");
  assert.equal(classifyStoredKeyFailure(failed, { apiKeyVerifiedAt: "2026-08-20T00:00:00.000Z" }).operationError.code, "API_KEY_REVOKED");
  assert.equal(classifyStoredKeyFailure(failed, {}).operationError.code, "API_KEY_INVALID");
});

test("clear removes every current and legacy credential", () => {
  let stored;
  const output = clearCredentials({ apiUrl: "https://api.example", apiKey: SECRET, sessionToken: "legacy", userId: "u", apiKeyId: "k" }, (value) => { stored = value; });
  assert.deepEqual(stored, { apiUrl: "https://api.example" });
  assert.equal(JSON.stringify(output).includes(SECRET), false);
});

test("CLI source has no password login contract", () => {
  const source = readFileSync(fileURLToPath(new URL("../src/index.mjs", import.meta.url)), "utf8");
  assert.equal(source.includes("/api/auth/login"), false);
  assert.equal(source.includes("--password"), false);
});
