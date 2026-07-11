#!/usr/bin/env node

/**
 * Paridade de Risco Local MCP Server — @paridade-risco/mcp
 *
 * MCP server for coding agents (Claude Code, Cursor, OpenCode).
 * Provides tools for querying the Paridade de Risco API via stdio transport.
 */

import { apiGet } from "@paridade-risco/shared/http-client";
import { executeMcpReadOperation, mcpErrorResult, operationCatalog, operationToMcpTool } from "@paridade-risco/shared/contracts";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { pathToFileURL } from "node:url";

const server = new Server(
  { name: "paridade-risco-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

export async function executeLocalMcpTool(name, args, request = apiGet) {
  if (!operationCatalog[name]) {
    return mcpErrorResult({ code: "UNKNOWN_OPERATION", category: "validation", message: `Unknown tool: ${name}`, retryable: false });
  }
  return executeMcpReadOperation(name, args, request);
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: Object.values(operationCatalog).map(operationToMcpTool),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    return await executeLocalMcpTool(name, args);
  } catch (error) {
    return mcpErrorResult(error, { code: "OPERATION_FAILED", category: "upstream", retryable: true });
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("MCP Server fatal:", error);
    process.exit(1);
  });
}
