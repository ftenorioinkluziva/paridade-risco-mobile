#!/usr/bin/env node

/**
 * Paridade de Risco Local MCP Server — @paridade-risco/mcp
 *
 * MCP server for coding agents (Claude Code, Cursor, OpenCode).
 * Provides tools for querying the Paridade de Risco API via stdio transport.
 *
 * Tools:
 *   portfolio_summary    — Get portfolio snapshot
 *   prices_status        — Check price update status
 *   rebalance_preview    — Preview rebalance
 *   update_prices_all    — Trigger price update for all assets
 */

import { readFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG_DIR = join(homedir(), ".config", "paridade-risco");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");
const DEFAULT_API_URL = "https://paridaderisco.blackboxinovacao.com.br";

function loadConfig() {
  const apiUrl = process.env.PARIDADE_API_URL || DEFAULT_API_URL;
  const sessionToken = process.env.PARIDADE_SESSION_TOKEN;
  const userId = process.env.PARIDADE_USER_ID;

  // Try file config as fallback
  if (!sessionToken && existsSync(CONFIG_PATH)) {
    try {
      const fileConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      return {
        apiUrl: apiUrl,
        sessionToken: fileConfig.sessionToken,
        userId: fileConfig.userId,
      };
    } catch {
      // ignore
    }
  }

  return { apiUrl, sessionToken, userId };
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

async function apiGet(path) {
  const config = loadConfig();
  const headers = { "Content-Type": "application/json" };

  if (config.sessionToken) {
    headers["Authorization"] = `Bearer ${config.sessionToken}`;
  }
  if (config.userId) {
    headers["x-user-id"] = config.userId;
  }

  try {
    const url = `${config.apiUrl.replace(/\/+$/, "")}${path}`;
    const response = await fetch(url, { headers });
    const data = response.ok ? await response.json() : null;
    return {
      ok: response.ok,
      status: response.status,
      data,
      error: !response.ok ? `HTTP ${response.status}: ${response.statusText}` : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

async function apiPost(path, body) {
  const config = loadConfig();
  const headers = { "Content-Type": "application/json" };

  if (config.sessionToken) {
    headers["Authorization"] = `Bearer ${config.sessionToken}`;
  }
  if (config.userId) {
    headers["x-user-id"] = config.userId;
  }

  try {
    const url = `${config.apiUrl.replace(/\/+$/, "")}${path}`;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = response.ok ? await response.json() : null;
    return {
      ok: response.ok,
      status: response.status,
      data,
      error: !response.ok ? `HTTP ${response.status}: ${response.statusText}` : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ─── Tool Implementations ────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "portfolio_summary",
    description:
      "Get the current portfolio snapshot: total value, positions, allocation, drift, funds, and cash balance.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async () => {
      const result = await apiGet("/api/portfolio/summary");
      if (!result.ok) throw new Error(result.error || "Failed to fetch portfolio");
      return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
    },
  },
  {
    name: "prices_status",
    description:
      "Check price update status for all active assets. Returns last update date and stale days per ticker.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async () => {
      const result = await apiGet("/api/admin/prices");
      if (!result.ok) throw new Error(result.error || "Failed to fetch price status");
      return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
    },
  },
  {
    name: "rebalance_preview",
    description:
      "Get rebalance preview: portfolio drift, target basket, buy/sell actions with amounts and target percentages.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async () => {
      const result = await apiGet("/api/rebalance/preview");
      if (!result.ok) throw new Error(result.error || "Failed to fetch rebalance preview");
      return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
    },
  },
  {
    name: "update_prices_all",
    description:
      "Trigger a price update for all active assets. By default runs incremental (only new dates). Use full=true for a complete refresh.",
    inputSchema: {
      type: "object",
      properties: {
        incremental: {
          type: "boolean",
          description: "Incremental update (default: true). Set to false for full refresh",
          default: true,
        },
      },
      required: [],
    },
    handler: async (args) => {
      const incremental = args?.incremental !== false;
      const result = await apiPost("/api/admin/prices", {
        action: "update-all",
        incremental,
      });
      if (!result.ok) throw new Error(result.error || "Failed to trigger price update");
      return { content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }] };
    },
  },
];

// ─── MCP Server ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: "paridade-risco-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = TOOLS.find((t) => t.name === name);

  if (!tool) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    return await tool.handler(args);
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: error instanceof Error ? error.message : String(error),
        },
      ],
      isError: true,
    };
  }
});

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server will hang here waiting for stdio messages — this is correct!
}

main().catch((error) => {
  console.error("MCP Server fatal:", error);
  process.exit(1);
});