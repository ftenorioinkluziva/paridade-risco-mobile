#!/usr/bin/env node

/**
 * Paridade de Risco Remote MCP Server — @paridade-risco/remote-mcp
 *
 * Remote MCP server accessible via HTTP, for web-based AI assistants
 * like chatgpt.com and claude.com.
 *
 * Endpoint: POST /:token/mcp
 *
 * The :token parameter serves as basic URL-based auth (similar to
 * Firecrawl and other MCP servers).
 *
 * Deploy targets: Railway, Vercel, any Node.js hosting.
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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

function loadApiConfig() {
  const apiUrl = process.env.PARIDADE_API_URL || "https://paridaderisco.blackboxinovacao.com.br";
  const sessionToken = process.env.PARIDADE_SESSION_TOKEN;
  const userId = process.env.PARIDADE_USER_ID;

  if (!sessionToken) {
    const configPath = join(homedir(), ".config", "paridade-risco", "config.json");
    if (existsSync(configPath)) {
      try {
        const f = JSON.parse(readFileSync(configPath, "utf-8"));
        return { apiUrl, sessionToken: f.sessionToken, userId: f.userId };
      } catch { /* ignore */ }
    }
  }
  return { apiUrl, sessionToken, userId };
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

async function apiGet(path) {
  const config = loadApiConfig();
  const headers = { "Content-Type": "application/json" };
  if (config.sessionToken) headers["Authorization"] = `Bearer ${config.sessionToken}`;
  if (config.userId) headers["x-user-id"] = config.userId;

  try {
    const url = `${config.apiUrl.replace(/\/+$/, "")}${path}`;
    const res = await fetch(url, { headers });
    const data = res.ok ? await res.json() : null;
    return { ok: res.ok, status: res.status, data, error: !res.ok ? `HTTP ${res.status}` : undefined };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "Network error" };
  }
}

async function apiPost(path, body) {
  const config = loadApiConfig();
  const headers = { "Content-Type": "application/json" };
  if (config.sessionToken) headers["Authorization"] = `Bearer ${config.sessionToken}`;
  if (config.userId) headers["x-user-id"] = config.userId;

  try {
    const url = `${config.apiUrl.replace(/\/+$/, "")}${path}`;
    const res = await fetch(url, { method: "POST", headers, body: body ? JSON.stringify(body) : undefined });
    const data = res.ok ? await res.json() : null;
    return { ok: res.ok, status: res.status, data, error: !res.ok ? `HTTP ${res.status}` : undefined };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : "Network error" };
  }
}

// ─── Tool Handlers ───────────────────────────────────────────────────────────

const TOOL_HANDLERS = {
  portfolio_summary: async () => {
    const r = await apiGet("/api/portfolio/summary");
    if (!r.ok) throw new Error(r.error || "Failed to fetch portfolio");
    return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
  },
  prices_status: async () => {
    const r = await apiGet("/api/admin/prices");
    if (!r.ok) throw new Error(r.error || "Failed to fetch price status");
    return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
  },
  rebalance_preview: async () => {
    const r = await apiGet("/api/rebalance/preview");
    if (!r.ok) throw new Error(r.error || "Failed to fetch rebalance preview");
    return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
  },
  update_prices_all: async (args) => {
    const incremental = args?.incremental !== false;
    const r = await apiPost("/api/admin/prices", { action: "update-all", incremental });
    if (!r.ok) throw new Error(r.error || "Failed to trigger price update");
    return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
  },
};

// ─── MCP Server Factory ──────────────────────────────────────────────────────

function createMcpServer() {
  const server = new Server(
    { name: "paridade-risco-remote-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "portfolio_summary",
        description: "Current portfolio snapshot: total value, positions, allocation, drift, funds, cash.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "prices_status",
        description: "Price update status for all assets: last update date, stale days per ticker.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "rebalance_preview",
        description: "Rebalance preview: drift, target basket, buy/sell actions with amounts.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "update_prices_all",
        description: "Trigger price update for all active assets. incremental=true (default) for new dates only.",
        inputSchema: {
          type: "object",
          properties: {
            incremental: { type: "boolean", description: "Incremental (default true). false = full refresh" },
          },
          required: [],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = TOOL_HANDLERS[name];
    if (!handler) {
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
    try {
      return await handler(args);
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
  const server = createMcpServer();
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

// Start server when run directly
import { serve } from "@hono/node-server";

console.log(`[Paridade Risco Remote MCP]`);
console.log(`  Server: http://localhost:${port}`);
console.log(`  MCP:    POST http://localhost:${port}/:token/mcp`);
console.log(`  API:    ${loadApiConfig().apiUrl || "(not configured)"}`);
console.log(`  Auth:   ${loadApiConfig().sessionToken ? "✅ configured" : "⚠️  no session token"}`);

serve({ fetch: app.fetch, port });

// Also export for serverless environments
export default app;