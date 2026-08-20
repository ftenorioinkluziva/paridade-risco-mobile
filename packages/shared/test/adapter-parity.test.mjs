import test from "node:test";
import assert from "node:assert/strict";
import { executeCliOperation } from "../../cli/src/index.mjs";
import { executeLocalMcpTool } from "../../local-mcp/src/index.mjs";
import { executeRemoteMcpTool } from "../../../apps/remote-mcp/src/index.mjs";

const data = { id: "b", name: "Basket", description: "Active basket" };

test("CLI, local MCP and remote MCP expose the same success envelope and effective input", async () => {
  const calls = [];
  const request = async (path, operation, body) => {
    calls.push({ path, operation, body });
    return { ok: true, data };
  };
  const cli = await executeCliOperation("get_active_basket", {}, request);
  const local = JSON.parse((await executeLocalMcpTool("get_active_basket", {}, request)).content[0].text);
  const remote = JSON.parse((await executeRemoteMcpTool("get_active_basket", {}, "token", (path, _token, operation, body) => request(path, operation, body))).content[0].text);
  assert.deepEqual(local, cli);
  assert.deepEqual(remote, cli);
  assert.deepEqual(calls, Array(3).fill({ path: "/api/baskets/active", operation: "get_active_basket", body: undefined }));
});

test("all adapters preserve the same canonical error code", async () => {
  const operationError = { code: "UPSTREAM_TIMEOUT", category: "upstream", message: "Timed out", retryable: true };
  const request = async () => ({ ok: false, operationError });
  await assert.rejects(() => executeCliOperation("get_active_basket", {}, request), (error) => error.operationError.code === operationError.code);
  const local = JSON.parse((await executeLocalMcpTool("get_active_basket", {}, request)).content[0].text);
  const remote = JSON.parse((await executeRemoteMcpTool("get_active_basket", {}, "token", (path, _token, operation, body) => request(path, operation, body))).content[0].text);
  assert.equal(local.error.code, operationError.code);
  assert.equal(remote.error.code, operationError.code);
  assert.deepEqual(local, remote);
});

test("invalid and unknown inputs fail canonically in executable adapters", async () => {
  const request = async () => { throw new Error("must not request"); };
  await assert.rejects(() => executeCliOperation("pluggy_financial_health", { days: 0 }, request), (error) => error.operationError.code === "INVALID_INPUT");
  for (const result of [
    await executeLocalMcpTool("pluggy_financial_health", { days: 0 }, request),
    await executeRemoteMcpTool("pluggy_financial_health", { days: 0 }, "token", request),
    await executeLocalMcpTool("missing", {}, request),
    await executeRemoteMcpTool("missing", {}, "token", request),
  ]) {
    const payload = JSON.parse(result.content[0].text);
    assert.equal(result.isError, true);
    assert.match(payload.error.code, /INVALID_INPUT|UNKNOWN_OPERATION/);
  }
});
