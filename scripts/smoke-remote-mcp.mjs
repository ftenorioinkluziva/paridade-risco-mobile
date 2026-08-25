#!/usr/bin/env node

const baseUrl = (process.env.MCP_PUBLIC_URL ?? "https://paridaderisco.blackboxinovacao.com.br").replace(/\/+$/, "");
const timeoutMs = Number(process.env.MCP_SMOKE_TIMEOUT_MS ?? 15_000);
const bearerToken = process.env.MCP_BEARER_TOKEN?.trim();

const initializePayload = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "paridade-risco-smoke", version: "1.0.0" },
  },
});

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${baseUrl}${path}`, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function errorCode(payload) {
  return payload?.error?.code ?? payload?.code ?? payload?.data?.error?.code;
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const health = await request("/api/health", { headers: { Accept: "application/json" } });
  const healthPayload = await readJson(health);
  requireCondition(health.status === 200, `API health returned HTTP ${health.status}`);
  requireCondition(healthPayload?.ok === true, "API health payload is not ok=true");

  const unauthenticated = await request("/mcp", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: initializePayload,
  });
  const unauthenticatedPayload = await readJson(unauthenticated);
  requireCondition(unauthenticated.status === 401, `MCP unauthenticated request returned HTTP ${unauthenticated.status}`);
  requireCondition(errorCode(unauthenticatedPayload) === "UNAUTHORIZED", "MCP unauthenticated response is not canonical UNAUTHORIZED JSON");

  if (bearerToken) {
    const authenticated = await request("/mcp", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: initializePayload,
    });
    const authenticatedPayload = await readJson(authenticated);
    requireCondition(authenticated.status === 200, `MCP authenticated request returned HTTP ${authenticated.status}`);
    requireCondition(authenticatedPayload?.result?.serverInfo?.name === "paridade-risco-remote-mcp", "MCP initialize response has unexpected serverInfo");
  }

  console.log(`[remote-mcp-smoke] ${baseUrl} API=200 MCP_UNAUTH=401${bearerToken ? " MCP_AUTH=200" : ""}`);
}

main().catch((error) => {
  console.error(`[remote-mcp-smoke] FAIL: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
