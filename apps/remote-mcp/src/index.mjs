#!/usr/bin/env node

/**
 * Paridade de Risco Remote MCP Server — @paridade-risco/remote-mcp
 *
 * Remote MCP server accessible via HTTP, for web-based AI assistants
 * like chatgpt.com and claude.com.
 *
 * Canonical endpoint: POST /mcp with Authorization: Bearer <session token>.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorEnvelope, executeMcpReadOperation, mcpErrorResult, operationCatalog, operationToMcpTool } from "@paridade-risco/shared/contracts";
import { apiGetWithContext, apiRequestWithContext } from "@paridade-risco/shared/http-client";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { pathToFileURL } from "node:url";

// ─── Config ──────────────────────────────────────────────────────────────────

function loadApiUrl() {
  return process.env.PARIDADE_API_URL || "https://paridaderisco.blackboxinovacao.com.br";
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

async function executeRemoteApi(path, sessionToken, operation, body) {
  const contract = operationCatalog[operation];
  const method = contract?.method ?? "GET";
  return apiRequestWithContext(method, path, operation, body, { apiUrl: loadApiUrl(), sessionToken });
}

// ─── MCP Server Factory ──────────────────────────────────────────────────────

function createMcpServer(sessionToken) {
  const server = new Server(
    { name: "paridade-risco-remote-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: Object.values(operationCatalog).map(operationToMcpTool) }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      return await executeRemoteMcpTool(name, args, sessionToken);
    } catch (error) {
      return mcpErrorResult(error, { code: "OPERATION_FAILED", category: "upstream", retryable: true });
    }
  });

  return server;
}

// ─── Hono Server ─────────────────────────────────────────────────────────────

export function extractBearerToken(authorization) {
  if (!authorization) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  return match?.[1] ?? null;
}

export async function executeRemoteMcpTool(name, args, sessionToken, request = executeRemoteApi) {
  if (!operationCatalog[name]) {
    return mcpErrorResult({ code: "UNKNOWN_OPERATION", category: "validation", message: `Unknown tool: ${name}`, retryable: false });
  }
  return executeMcpReadOperation(name, args, (path, operation, body) => request(path, sessionToken, operation, body));
}

export function createRemoteMcpApp({
  validateSession = async (token) => (await apiGet("/api/auth/me", token)).ok,
  serveAuthenticatedMcp,
} = {}) {
const app = new Hono();

app.use("*", cors());
app.use("*", async (c, next) => {
  const startedAt = Date.now();
  await next();
  // Log only the route template/public path. Never log Authorization or legacy token paths.
  const safePath = c.req.path === "/mcp" ? "/mcp" : c.req.path === "/" ? "/" : "[redacted-path]";
  console.log(`${c.req.method} ${safePath} ${c.res.status} ${Date.now() - startedAt}ms`);
});

app.get("/", (c) => c.json({ status: "ok", service: "paridade-risco-remote-mcp" }));

function authError(c, message = "Missing, invalid or expired session token") {
  return c.json(errorEnvelope({ code: "UNAUTHORIZED", category: "authorization", message, retryable: false }), 401);
}

async function handleMcp(c, sessionToken) {
  if (!sessionToken) return authError(c);

  if (!(await validateSession(sessionToken))) {
    return authError(c);
  }

  return (serveAuthenticatedMcp ?? handleAuthenticatedMcp)(c, sessionToken);
}

async function handleAuthenticatedMcp(c, sessionToken) {

  const server = createMcpServer(sessionToken);
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(c.req.raw);
    return response;
  } catch (error) {
    console.error("MCP handler error", { name: error instanceof Error ? error.name : "UnknownError" });
    return c.json(errorEnvelope({ code: "INTERNAL_ERROR", category: "internal", message: "Internal error", retryable: true }), 500);
  } finally {
    try { await server.close(); } catch { /* ignore */ }
  }
}

app.post("/mcp", (c) => handleMcp(c, extractBearerToken(c.req.header("authorization"))));

app.all("*", (c) => c.json({ error: "Not found. Use POST /mcp with Authorization: Bearer" }, 404));
return app;
}

const app = createRemoteMcpApp();

// ─── Main ────────────────────────────────────────────────────────────────────

const port = parseInt(process.env.PORT || "3000", 10);

import { serve } from "@hono/node-server";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`[Paridade Risco Remote MCP]`);
  console.log(`  Server: http://localhost:${port}`);
  console.log(`  MCP:    POST http://localhost:${port}/mcp (Authorization: Bearer)`);
  console.log(`  API:    ${loadApiUrl() || "(not configured)"}`);
  serve({ fetch: app.fetch, port });
}

export default app;
