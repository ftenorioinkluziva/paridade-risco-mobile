import test from "node:test";
import assert from "node:assert/strict";
import { executeCliOperation } from "../../cli/src/index.mjs";
import { executeLocalMcpTool } from "../../local-mcp/src/index.mjs";
import { executeRemoteMcpTool } from "../../../apps/remote-mcp/src/index.mjs";

const data = [{ id: "t", assetTicker: "AAA", assetName: "Asset", type: "COMPRA", shares: 1, pricePerShare: 2, amount: 2, tradedAt: "2026-07-10T12:00:00.000Z", dateLabel: "10 jul" }];

test("CLI, local MCP and remote MCP expose the same success envelope and effective input", async () => {
  const calls = [];
  const request = async (path, operation) => {
    calls.push({ path, operation });
    return { ok: true, data };
  };
  const cli = await executeCliOperation("transaction_history", { limit: 7 }, request);
  const local = JSON.parse((await executeLocalMcpTool("transaction_history", { limit: 7 }, request)).content[0].text);
  const remote = JSON.parse((await executeRemoteMcpTool("transaction_history", { limit: 7 }, "token", (path, _token, operation) => request(path, operation))).content[0].text);
  assert.deepEqual(local, cli);
  assert.deepEqual(remote, cli);
  assert.deepEqual(calls, Array(3).fill({ path: "/api/transactions?limit=7", operation: "transaction_history" }));
});

test("all adapters preserve the same canonical error code", async () => {
  const operationError = { code: "UPSTREAM_TIMEOUT", category: "upstream", message: "Timed out", retryable: true };
  const request = async () => ({ ok: false, operationError });
  await assert.rejects(() => executeCliOperation("transaction_history", {}, request), (error) => error.operationError.code === operationError.code);
  const local = JSON.parse((await executeLocalMcpTool("transaction_history", {}, request)).content[0].text);
  const remote = JSON.parse((await executeRemoteMcpTool("transaction_history", {}, "token", (path, _token, operation) => request(path, operation))).content[0].text);
  assert.equal(local.error.code, operationError.code);
  assert.equal(remote.error.code, operationError.code);
  assert.deepEqual(local, remote);
});

test("invalid and unknown inputs fail canonically in executable adapters", async () => {
  const request = async () => { throw new Error("must not request"); };
  await assert.rejects(() => executeCliOperation("transaction_history", { limit: 0 }, request), (error) => error.operationError.code === "INVALID_INPUT");
  for (const result of [
    await executeLocalMcpTool("transaction_history", { limit: 0 }, request),
    await executeRemoteMcpTool("transaction_history", { limit: 0 }, "token", request),
    await executeLocalMcpTool("missing", {}, request),
    await executeRemoteMcpTool("missing", {}, "token", request),
  ]) {
    const payload = JSON.parse(result.content[0].text);
    assert.equal(result.isError, true);
    assert.match(payload.error.code, /INVALID_INPUT|UNKNOWN_OPERATION/);
  }
});
