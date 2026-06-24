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

import { loadConfig, apiGet, apiPost } from "@paridade-risco/shared/http-client";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

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