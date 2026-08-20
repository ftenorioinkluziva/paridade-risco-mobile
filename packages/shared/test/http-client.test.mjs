import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apiGet, apiGetWithContext, apiPost, legacyCliSessionEnabled, loadOrInitConfig } from "../src/http-client.mjs";
import { executeMcpReadOperation } from "../src/contracts.mjs";

test("HTTP client preserves a canonical API error", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(JSON.stringify({
    success: false,
    error: { code: "FORBIDDEN", category: "authorization", message: "Denied", retryable: false },
  }), { status: 403, headers: { "content-type": "application/json" } });
  const result = await apiGet("/test");
  assert.equal(result.ok, false);
  assert.equal(result.operationError.code, "FORBIDDEN");
  assert.equal(result.operationError.retryable, false);
});

test("HTTP client converts legacy errors to stable canonical codes", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "Missing" }), { status: 404, headers: { "content-type": "application/json" } });
  const result = await apiGet("/test");
  assert.equal(result.operationError.code, "NOT_FOUND");
  assert.equal(result.operationError.category, "not_found");
});

test("HTTP client rejects non-JSON responses predictably", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response("proxy error", { status: 502, headers: { "content-type": "text/html" } });
  const result = await apiGet("/test");
  assert.equal(result.ok, false);
  assert.equal(result.operationError.code, "UPSTREAM_CONTENT_TYPE_INVALID");
  assert.equal(result.operationError.retryable, false);
});

test("HTTP client distinguishes malformed JSON from transport failures", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response('{"broken":', { status: 200, headers: { "content-type": "application/json" } });
  const result = await apiGet("/test");
  assert.equal(result.operationError.code, "UPSTREAM_JSON_INVALID");
  assert.equal(result.operationError.retryable, false);
});

test("HTTP client reports timeouts as retryable", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => { throw new DOMException("timed out", "TimeoutError"); };
  const result = await apiGet("/test");
  assert.equal(result.operationError.code, "UPSTREAM_TIMEOUT");
  assert.equal(result.operationError.retryable, true);
});

test("HTTP client rejects an incompatible operation output", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(JSON.stringify({ incompatible: true }), { status: 200, headers: { "content-type": "application/json" } });
  const result = await apiGet("/api/assets", "list_assets");
  assert.equal(result.ok, false);
  assert.equal(result.operationError.code, "UPSTREAM_SCHEMA_INVALID");
});

test("POST login rejects an incompatible HTTP 200 payload before the CLI can consume it", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(JSON.stringify({ token: 123, user: null }), { status: 200, headers: { "content-type": "application/json" } });
  const result = await apiPost("/api/auth/login", { email: "user@example.com", password: "private" }, "login");
  assert.equal(result.ok, false);
  assert.equal(result.data, undefined);
  assert.equal(result.operationError.code, "UPSTREAM_SCHEMA_INVALID");
  assert.equal(result.operationError.retryable, false);
});

test("remote MCP flow preserves canonical non-2xx response body", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, error: { code: "SESSION_EXPIRED", category: "authorization", message: "Expired", retryable: false } }), { status: 401, headers: { "content-type": "application/json" } });
  const result = await executeMcpReadOperation("list_assets", {}, (path, operation) => apiGetWithContext(path, operation, { apiUrl: "https://api.example", sessionToken: "private" }));
  const payload = JSON.parse(result.content[0].text);
  assert.equal(payload.error.code, "SESSION_EXPIRED");
  assert.equal(payload.error.retryable, false);
});

test("local and remote MCP read flow reject incompatible HTTP 200 output", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(JSON.stringify({ incompatible: true }), { status: 200, headers: { "content-type": "application/json" } });
  const local = await executeMcpReadOperation("list_assets", {}, apiGet);
  const remote = await executeMcpReadOperation("list_assets", {}, (path, operation) => apiGetWithContext(path, operation, { apiUrl: "https://api.example", sessionToken: "private" }));
  assert.equal(JSON.parse(local.content[0].text).error.code, "UPSTREAM_SCHEMA_INVALID");
  assert.equal(JSON.parse(remote.content[0].text).error.code, "UPSTREAM_SCHEMA_INVALID");
});

test("API key takes precedence and consumer telemetry header contains no secret", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, "Bearer pr_mcp_private");
    assert.equal(options.headers["x-paridade-consumer"], "cli");
    assert.equal(JSON.stringify(options.headers).includes("legacy-private"), false);
    return new Response(JSON.stringify({ valid: true }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const result = await apiGetWithContext("/validate", undefined, { apiKey: "pr_mcp_private", sessionToken: "legacy-private", consumer: "cli" });
  assert.equal(result.ok, true);
});

test("legacy CLI session fallback can be disabled explicitly", () => {
  assert.equal(legacyCliSessionEnabled({}), true);
  assert.equal(legacyCliSessionEnabled({ PARIDADE_CLI_LEGACY_SESSION_ENABLED: "false" }), false);
});

test("CLI initialization honors an environment API URL in an isolated config", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "paridade-shared-test-"));
  const previousPath = process.env.PARIDADE_CONFIG_PATH;
  const previousUrl = process.env.PARIDADE_API_URL;
  t.after(() => {
    if (previousPath === undefined) delete process.env.PARIDADE_CONFIG_PATH; else process.env.PARIDADE_CONFIG_PATH = previousPath;
    if (previousUrl === undefined) delete process.env.PARIDADE_API_URL; else process.env.PARIDADE_API_URL = previousUrl;
    rmSync(directory, { recursive: true, force: true });
  });
  process.env.PARIDADE_CONFIG_PATH = join(directory, "config.json");
  process.env.PARIDADE_API_URL = "http://127.0.0.1:3999";
  assert.equal(loadOrInitConfig().apiUrl, "http://127.0.0.1:3999");
});
