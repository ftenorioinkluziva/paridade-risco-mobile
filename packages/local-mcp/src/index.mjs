#!/usr/bin/env node

/**
 * Paridade de Risco Local MCP Server — @paridade-risco/mcp
 *
 * MCP server for coding agents (Claude Code, Cursor, OpenCode).
 * Provides tools for querying the Paridade de Risco API via stdio transport.
 */

import { apiGet } from "@paridade-risco/shared/http-client";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const TOOLS = [
  {
    name: "portfolio_summary",
    description: "Current portfolio snapshot: total value, positions, allocation, drift, funds, cash.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const r = await apiGet("/api/portfolio/summary");
      if (!r.ok) throw new Error(r.error || "Failed to fetch portfolio");
      return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
    },
  },
  {
    name: "prices_status",
    description: "Price update status for all assets: last update date, stale days per ticker.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const r = await apiGet("/api/admin/prices");
      if (!r.ok) throw new Error(r.error || "Failed to fetch price status");
      return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
    },
  },
  {
    name: "rebalance_preview",
    description: "Rebalance preview: drift, target basket, buy/sell actions with amounts.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const r = await apiGet("/api/rebalance/preview");
      if (!r.ok) throw new Error(r.error || "Failed to fetch rebalance preview");
      return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
    },
  },
  {
    name: "list_assets",
    description: "List all available assets with ticker and name.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const r = await apiGet("/api/assets");
      if (!r.ok) throw new Error(r.error || "Failed to fetch assets");
      return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
    },
  },
  {
    name: "asset_prices",
    description: "Current prices for all assets: ticker, name, price, price date, calculation type.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const r = await apiGet("/api/assets/prices");
      if (!r.ok) throw new Error(r.error || "Failed to fetch asset prices");
      return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
    },
  },
  {
    name: "funds_summary",
    description: "Summary of all funds: name, ticker, initial investment, current value, last update.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const r = await apiGet("/api/funds");
      if (!r.ok) throw new Error(r.error || "Failed to fetch funds");
      return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
    },
  },
  {
    name: "list_baskets",
    description: "List all baskets: name, status (ATIVA/RASCUNHO), asset count.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const r = await apiGet("/api/baskets");
      if (!r.ok) throw new Error(r.error || "Failed to fetch baskets");
      return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
    },
  },
  {
    name: "basket_detail",
    description: "Detail of a specific basket: name, status, allocations with target percentages.",
    inputSchema: {
      type: "object",
      properties: {
        basketId: { type: "string", description: "Basket ID (UUID)" },
      },
      required: ["basketId"],
    },
    handler: async (args) => {
      if (!args?.basketId) throw new Error("basketId is required");
      const r = await apiGet(`/api/baskets/${args.basketId}`);
      if (!r.ok) throw new Error(r.error || "Failed to fetch basket detail");
      return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
    },
  },
  {
    name: "transaction_history",
    description: "Recent transactions: asset, type (COMPRA/VENDA), shares, price, amount, date.",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      const r = await apiGet("/api/transactions");
      if (!r.ok) throw new Error(r.error || "Failed to fetch transactions");
      return { content: [{ type: "text", text: JSON.stringify(r.data, null, 2) }] };
    },
  },
];

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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP Server fatal:", error);
  process.exit(1);
});
