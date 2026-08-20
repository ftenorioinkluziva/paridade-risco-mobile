import assert from "node:assert/strict";
import test from "node:test";

import { createRemoteMcpApp, extractBearerToken } from "../src/index.mjs";

const canonicalUnauthorized = {
  success: false,
  error: { code: "UNAUTHORIZED", category: "authorization", message: "Missing, invalid or expired MCP token", retryable: false },
};

test("Bearer parser rejects public or malformed credentials", () => {
  assert.equal(extractBearerToken("Bearer session-token"), "session-token");
  assert.equal(extractBearerToken("Basic session-token"), null);
  assert.equal(extractBearerToken("Bearer"), null);
  assert.equal(extractBearerToken(null), null);
});

for (const scenario of ["missing", "invalid", "expired"]) {
  test(`${scenario} MCP key returns canonical 401`, async () => {
    const app = createRemoteMcpApp({ validateSession: async () => false });
    const headers = scenario === "missing" ? {} : { Authorization: `Bearer ${scenario}-token` };
    const response = await app.request("/mcp", { method: "POST", headers });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), canonicalUnauthorized);
  });
}

test("valid scoped MCP key reaches MCP using Bearer and never x-user-id", async () => {
  const observed = [];
  const app = createRemoteMcpApp({
    validateSession: async (token) => { observed.push(["validate", token]); return true; },
    serveAuthenticatedMcp: async (c, token) => { observed.push(["serve", token, c.req.header("x-user-id")]); return c.json({ success: true }); },
  });
  const response = await app.request("/mcp", { method: "POST", headers: { Authorization: "Bearer valid-token", "x-user-id": "admin-victim" } });
  assert.equal(response.status, 200);
  assert.deepEqual(observed, [["validate", "valid-token"], ["serve", "valid-token", "admin-victim"]]);
});

test("default validator forwards the MCP key to the canonical validation endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const observed = [];
  globalThis.fetch = async (url, options) => {
    observed.push([String(url), options?.headers?.Authorization]);
    return new Response(JSON.stringify({ valid: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const app = createRemoteMcpApp({
      serveAuthenticatedMcp: async (c) => c.json({ success: true }),
    });
    const response = await app.request("/mcp", {
      method: "POST",
      headers: { Authorization: "Bearer pr_mcp_test" },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(observed, [[
      "https://paridaderisco.blackboxinovacao.com.br/api/auth/mcp-token/validate",
      "Bearer pr_mcp_test",
    ]]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("legacy credential path is absent and migration headers cannot advertise it", async () => {
  const app = createRemoteMcpApp();
  const response = await app.request("/secret-session/mcp", { method: "POST" });
  assert.equal(response.status, 404);
  assert.equal(response.headers.has("sunset"), false);
  assert.equal(response.headers.has("deprecation"), false);
  assert.equal(response.headers.get("link"), null);
});

test("access logs redact unknown paths and never include headers or tokens", async () => {
  const logs = [];
  const original = console.log;
  console.log = (line) => logs.push(String(line));
  try {
    const app = createRemoteMcpApp({ validateSession: async () => false });
    await app.request("/secret-in-path/mcp", { method: "POST", headers: { Authorization: "Bearer header-secret" } });
    await app.request("/mcp", { method: "POST", headers: { Authorization: "Bearer bearer-secret" } });
  } finally {
    console.log = original;
  }
  assert.equal(logs.some((line) => /secret-in-path|header-secret|bearer-secret/.test(line)), false);
  assert.equal(logs.some((line) => line.includes("[redacted-path]")), true);
});
