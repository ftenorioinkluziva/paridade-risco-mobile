#!/usr/bin/env node

/**
 * Paridade de Risco Remote MCP Server — @paridade-risco/remote-mcp
 *
 * Remote MCP server accessible via HTTP, for web-based AI assistants
 * like chatgpt.com and claude.com.
 *
 * Endpoint: POST /:token/mcp
 *
 * The :token parameter is the user's session token (Bearer token) from
 * the application. Each user uses their own token for auth.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

// ─── Config ──────────────────────────────────────────────────────────────────

function loadApiUrl() {
  return process.env.PARIDADE_API_URL || "https://paridaderisco.blackboxinovacao.com.br";
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

async function apiGet(path, sessionToken) {
  const headers = { "Content-Type": "application/json" };
  if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;

  try {
    const url = `${loadApiUrl().replace(/\/+$/, "")}${path}`;
    const res = await fetch(url, { headers });
    const data = res.ok ? await res.json() : null;
    return { ok: res.ok, status: res.status, data, error: !res.ok ? `HTTP ${res.status}` : undefined };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "Network error" };
  }
}

async function apiPost(path, body, sessionToken) {
  const headers = { "Content-Type": "application/json" };
  if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;

  try {
    const url = `${loadApiUrl().replace(/\/+$/, "")}${path}`;
    const res = await fetch(url, { method: "POST", headers, body: body ? JSON.stringify(body) : undefined });
    const data = res.ok ? await res.json() : null;
    return { ok: res.ok, status: res.status, data, error: !res.ok ? `HTTP ${res.status}` : undefined };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "Network error" };
  }
}

// ─── Tool Implementations ────────────────────────────────────────────────────

const TOOL_HANDLERS = {
  portfolio_summary: async (_args, token) => {
    const r = await apiGet("/api/portfolio/summary", token);
    if (!r.ok) throw new Error(r.error || "Failed to fetch portfolio");
    return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
  },
  prices_status: async (_args, token) => {
    const r = await apiGet("/api/admin/prices", token);
    if (!r.ok) throw new Error(r.error || "Failed to fetch price status");
    return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
  },
  rebalance_preview: async (_args, token) => {
    const r = await apiGet("/api/rebalance/preview", token);
    if (!r.ok) throw new Error(r.error || "Failed to fetch rebalance preview");
    return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
  },
  list_assets: async (_args, token) => {
    const r = await apiGet("/api/assets", token);
    if (!r.ok) throw new Error(r.error || "Failed to fetch assets");
    return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
  },
  asset_prices: async (_args, token) => {
    const r = await apiGet("/api/assets/prices", token);
    if (!r.ok) throw new Error(r.error || "Failed to fetch asset prices");
    return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
  },
  funds_summary: async (_args, token) => {
    const r = await apiGet("/api/funds", token);
    if (!r.ok) throw new Error(r.error || "Failed to fetch funds");
    return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
  },
  list_baskets: async (_args, token) => {
    const r = await apiGet("/api/baskets", token);
    if (!r.ok) throw new Error(r.error || "Failed to fetch baskets");
    return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
  },
  basket_detail: async (args, token) => {
    if (!args?.basketId) throw new Error("basketId is required");
    const r = await apiGet(`/api/baskets/${args.basketId}`, token);
    if (!r.ok) throw new Error(r.error || "Failed to fetch basket detail");
    return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
  },
  transaction_history: async (_args, token) => {
    const r = await apiGet("/api/transactions", token);
    if (!r.ok) throw new Error(r.error || "Failed to fetch transactions");
    return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
  },
};

const TOOL_DEFS = [
  { name: "portfolio_summary", description: "Current portfolio snapshot: total value, positions, allocation, drift, funds, cash.", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "prices_status", description: "Price update status for all assets: last update date, stale days per ticker.", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "rebalance_preview", description: "Rebalance preview: drift, target basket, buy/sell actions with amounts.", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "list_assets", description: "List all available assets with ticker and name.", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "asset_prices", description: "Current prices for all assets: ticker, name, price, price date, calculation type.", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "funds_summary", description: "Summary of all funds: name, ticker, initial investment, current value, last update.", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "list_baskets", description: "List all baskets: name, status (ATIVA/RASCUNHO), asset count.", inputSchema: { type: "object", properties: {}, required: [] } },
  { name: "basket_detail", description: "Detail of a specific basket: name, status, allocations with target percentages.", inputSchema: { type: "object", properties: { basketId: { type: "string", description: "Basket ID (UUID)" } }, required: ["basketId"] } },
  { name: "transaction_history", description: "Recent transactions: asset, type (COMPRA/VENDA), shares, price, amount, date.", inputSchema: { type: "object", properties: { limit: { type: "number", description: "Max transactions to return (default 20)" } }, required: [] } },
];

// ─── MCP Server Factory ──────────────────────────────────────────────────────

function createMcpServer(sessionToken) {
  const server = new Server(
    { name: "paridade-risco-remote-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = TOOL_HANDLERS[name];
    if (!handler) {
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
    try {
      return await handler(args, sessionToken);
    } catch (error) {
      return {
        content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  });

  return server;
}

// ─── Hono Server ─────────────────────────────────────────────────────────────

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

app.get("/", (c) => c.json({ status: "ok", service: "paridade-risco-remote-mcp" }));

app.post("/:token/mcp", async (c) => {
  const urlToken = c.req.param("token");

  // Validate token early by calling /api/auth/me
  const validation = await apiGet("/api/auth/me", urlToken);
  if (!validation.ok) {
    return c.json({ error: "Invalid or expired session token" }, 401);
  }

  const server = createMcpServer(urlToken);
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(c.req.raw);
    return response;
  } catch (error) {
    console.error("MCP handler error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      500,
    );
  } finally {
    try { await server.close(); } catch { /* ignore */ }
  }
});

app.all("*", (c) => c.json({ error: "Not found. Use POST /:token/mcp" }, 404));

// ─── Main ────────────────────────────────────────────────────────────────────

const port = parseInt(process.env.PORT || "3000", 10);

import { serve } from "@hono/node-server";

console.log(`[Paridade Risco Remote MCP]`);
console.log(`  Server: http://localhost:${port}`);
console.log(`  MCP:    POST http://localhost:${port}/:token/mcp`);
console.log(`  API:    ${loadApiUrl() || "(not configured)"}`);

serve({ fetch: app.fetch, port });

export default app;