import assert from "node:assert/strict";
import test from "node:test";

import { defaultMcpPermission, extractBearerToken, isMcpToken } from "./mcp-auth-rules";

test("recognizes only the dedicated MCP key prefix", () => {
  assert.equal(isMcpToken("pr_mcp_secret"), true);
  assert.equal(isMcpToken("legacy-session-token"), false);
  assert.equal(isMcpToken(null), false);
});

test("MCP keys are read-only unless a route grants an explicit permission", () => {
  assert.equal(defaultMcpPermission("GET"), "read");
  assert.equal(defaultMcpPermission("HEAD"), "read");
  assert.equal(defaultMcpPermission("POST"), undefined);
  assert.equal(defaultMcpPermission("DELETE"), undefined);
});

test("extracts a canonical Bearer credential", () => {
  assert.equal(extractBearerToken(new Request("https://example.test", { headers: { authorization: "Bearer pr_mcp_secret" } })), "pr_mcp_secret");
  assert.equal(extractBearerToken(new Request("https://example.test", { headers: { authorization: "Basic secret" } })), null);
});
