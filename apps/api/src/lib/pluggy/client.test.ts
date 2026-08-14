import assert from "node:assert/strict";
import test from "node:test";
import { readPluggyConfig, PluggyConfigurationError } from "./config";
import { PluggyApiError, PluggyClient, PluggyResponseError } from "./client";

const config = {
  environment: "sandbox" as const,
  apiBaseUrl: "https://api.pluggy.ai",
  clientId: "client-id",
  clientSecret: "client-secret",
  sandboxItemId: "sandbox-item",
  ignoreManualReconciliation: false,
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

test("sandbox is the default and production requires explicit opt-in", () => {
  assert.equal(readPluggyConfig({ PLUGGY_CLIENT_ID: "id", PLUGGY_CLIENT_SECRET: "secret" }).environment, "sandbox");
  assert.throws(() => readPluggyConfig({ PLUGGY_ENVIRONMENT: "production", PLUGGY_CLIENT_ID: "id", PLUGGY_CLIENT_SECRET: "secret" }), PluggyConfigurationError);
});

test("fictional manual baseline can be ignored only in sandbox", () => {
  const sandbox = readPluggyConfig({
    PLUGGY_CLIENT_ID: "id",
    PLUGGY_CLIENT_SECRET: "secret",
    PLUGGY_IGNORE_MANUAL_RECONCILIATION: "true",
  });
  assert.equal(sandbox.ignoreManualReconciliation, true);
  assert.throws(() => readPluggyConfig({
    PLUGGY_ENVIRONMENT: "production",
    PLUGGY_ENABLE_PRODUCTION: "true",
    PLUGGY_CLIENT_ID: "id",
    PLUGGY_CLIENT_SECRET: "secret",
    PLUGGY_IGNORE_MANUAL_RECONCILIATION: "true",
  }), PluggyConfigurationError);
});

test("client authenticates once, reuses the API key and sends server-side headers", async () => {
  const calls: Array<{ url: string; headers: Headers }> = [];
  const client = new PluggyClient(config, async (input, init) => {
    calls.push({ url: String(input), headers: new Headers(init?.headers) });
    if (String(input).endsWith("/auth")) return response({ apiKey: "api-key" });
    return response({ results: [{ id: "account-1" }], next: null });
  });

  await client.listAccounts("item-1");
  await client.listAccounts("item-1");

  assert.equal(calls.filter((call) => call.url.endsWith("/auth")).length, 1);
  assert.equal(calls[1].headers.get("X-API-KEY"), "api-key");
  assert.match(calls[1].url, /\/accounts\?itemId=item-1/);
});

test("401 invalidates the cached key and retries once", async () => {
  let authCount = 0;
  let accountCount = 0;
  const client = new PluggyClient(config, async (input) => {
    const url = String(input);
    if (url.endsWith("/auth")) {
      authCount += 1;
      return response({ apiKey: `api-key-${authCount}` });
    }
    accountCount += 1;
    return accountCount === 1 ? response({ error: "expired" }, 401) : response({ results: [], next: null });
  });

  await client.listAccounts("item-1");
  assert.equal(authCount, 2);
  assert.equal(accountCount, 2);
});

test("v2 transactions preserve cursor and date filters", async () => {
  let requestedUrl = "";
  const client = new PluggyClient(config, async (input) => {
    requestedUrl = String(input);
    return requestedUrl.endsWith("/auth") ? response({ apiKey: "api-key" }) : response({ results: [], next: "cursor-2" });
  });

  const result = await client.listTransactions({ accountId: "account-1", after: "cursor-1", dateFrom: "2026-08-01" });
  assert.equal(result.next, "cursor-2");
  assert.match(requestedUrl, /\/v2\/transactions\?/);
  assert.match(requestedUrl, /accountId=account-1/);
  assert.match(requestedUrl, /after=cursor-1/);
  assert.match(requestedUrl, /dateFrom=2026-08-01/);
});

test("invalid upstream payloads fail without exposing body", async () => {
  const client = new PluggyClient(config, async (input) => String(input).endsWith("/auth") ? response({ apiKey: "api-key" }) : response({ secret: "do-not-leak" }));
  await assert.rejects(() => client.listAccounts("item-1"), (error) => error instanceof PluggyResponseError && !error.message.includes("do-not-leak"));
  await assert.rejects(() => new PluggyClient(config, async (input) => String(input).endsWith("/auth") ? response({ apiKey: "api-key" }) : response({}, 503)).listAccounts("item-1"), (error) => error instanceof PluggyApiError && error.status === 503);
});
