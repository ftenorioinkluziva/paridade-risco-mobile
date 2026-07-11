/**
 * @paridade-risco/shared — HTTP Client
 *
 * Shared HTTP helper for all 3 adapters (CLI, Local MCP, Remote MCP).
 * Uses env vars first, file config as fallback.
 *
 * Config priority:
 *   1. PARIDADE_API_URL / PARIDADE_SESSION_TOKEN env vars
 *   2. ~/.config/paridade-risco/config.json (written by CLI `login`)
 *
 * Both CLI and MCP adapters share the same config file and endpoint helpers.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { ZodError } from "zod";
import { errorEnvelopeSchema, operationErrorSchema, operationFailure, responseSchemaCatalog, toOperationError } from "./contracts.mjs";

// ─── Constants ───────────────────────────────────────────────────────────────

const CONFIG_DIR = join(homedir(), ".config", "paridade-risco");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");
const DEFAULT_API_URL = "https://paridaderisco.blackboxinovacao.com.br";

// ─── Config (env-first, file fallback) ───────────────────────────────────────

/**
 * Load config: env vars first, then ~/.config/paridade-risco/config.json.
 * Read-only — never writes. Suitable for all 3 adapters.
 */
export function loadConfig() {
  const apiUrl = process.env.PARIDADE_API_URL || DEFAULT_API_URL;
  const sessionToken = process.env.PARIDADE_SESSION_TOKEN;

  // File config as fallback when env vars are not set
  if (!sessionToken && existsSync(CONFIG_PATH)) {
    try {
      const fileConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      return {
        apiUrl: fileConfig.apiUrl || apiUrl,
        sessionToken: fileConfig.sessionToken,
      };
    } catch {
      // Corrupt file — ignore and return env/defaults
    }
  }

  return { apiUrl, sessionToken };
}

/**
 * Save config to ~/.config/paridade-risco/config.json.
 * CLI-only — creates dir + file with 0o600 permissions.
 */
export function saveConfig(config) {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  chmodSync(CONFIG_PATH, 0o600);
}

/**
 * Load config with auto-init (CLI mode).
 * Creates default config file if missing, or if parse fails.
 */
export function loadOrInitConfig() {
  if (!existsSync(CONFIG_PATH)) {
    const defaults = { apiUrl: DEFAULT_API_URL };
    saveConfig(defaults);
    return defaults;
  }
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    const defaults = { apiUrl: DEFAULT_API_URL };
    saveConfig(defaults);
    return defaults;
  }
}

// ─── HTTP Helpers ────────────────────────────────────────────────────────────

function buildUrl(path) {
  const config = loadConfig();
  return `${config.apiUrl.replace(/\/+$/, "")}${path}`;
}

function buildHeaders() {
  const config = loadConfig();
  const headers = { "Content-Type": "application/json" };
  if (config.sessionToken) headers["Authorization"] = `Bearer ${config.sessionToken}`;
  return headers;
}

/**
 * GET request to the configured API.
 * Returns { ok, status, data?, error? }.
 */
export async function apiGet(path, operation) {
  return apiGetWithContext(path, operation);
}

export async function apiGetWithContext(path, operation, context = {}) {
  try {
    const response = await fetch(context.apiUrl ? `${context.apiUrl.replace(/\/+$/, "")}${path}` : buildUrl(path), {
      headers: context.sessionToken ? { "Content-Type": "application/json", Authorization: `Bearer ${context.sessionToken}` } : buildHeaders(),
    });
    const payload = await readJson(response);
    if (!response.ok) return failureFromResponse(response, payload);
    const data = validateOperationOutput(operation, payload);
    return {
      ok: true,
      status: response.status,
      data: data ?? undefined,
    };
  } catch (error) {
    const canonical = classifyRequestError(error);
    return {
      ok: false,
      status: 0,
      error: canonical.message,
      operationError: canonical,
    };
  }
}

/**
 * POST request to the configured API.
 * Returns { ok, status, data?, error? }.
 */
export async function apiPost(path, body, operation) {
  try {
    const response = await fetch(buildUrl(path), {
      method: "POST",
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await readJson(response);
    if (!response.ok) return failureFromResponse(response, payload);
    const data = validateOperationOutput(operation, payload);
    return {
      ok: true,
      status: response.status,
      data: data ?? undefined,
    };
  } catch (error) {
    const canonical = classifyRequestError(error);
    return {
      ok: false,
      status: 0,
      error: canonical.message,
      operationError: canonical,
    };
  }
}

async function readJson(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!/^(application\/json|[^;]+\+json)(?:;|$)/i.test(contentType.trim())) {
    throw operationFailure("UPSTREAM_CONTENT_TYPE_INVALID", "upstream", "Upstream response is not JSON", false);
  }
  try {
    return await response.json();
  } catch {
    throw operationFailure("UPSTREAM_JSON_INVALID", "upstream", "Upstream response contains invalid JSON", false);
  }
}

function failureFromResponse(response, payload) {
  const envelope = errorEnvelopeSchema.safeParse(payload);
  const direct = operationErrorSchema.safeParse(payload?.error);
  const operationError = envelope.success ? envelope.data.error : direct.success ? direct.data : {
    code: statusCode(response.status),
    category: statusCategory(response.status),
    message: typeof payload?.error === "string" ? payload.error : `HTTP ${response.status}: ${response.statusText}`,
    retryable: response.status === 429 || response.status >= 500,
  };
  return { ok: false, status: response.status, error: operationError.message, operationError };
}

function validateOperationOutput(operation, payload) {
  if (!operation) return payload;
  const schema = responseSchemaCatalog[operation];
  if (!schema) throw operationFailure("UNKNOWN_OPERATION", "validation", `Unknown response contract: ${operation}`, false);
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw operationFailure("UPSTREAM_SCHEMA_INVALID", "upstream", "Upstream response does not match the operation contract", false);
    }
    throw error;
  }
}

function classifyRequestError(error) {
  if (error?.operationError) return toOperationError(error);
  if (error?.name === "AbortError" || error?.name === "TimeoutError") {
    return toOperationError(error, { code: "UPSTREAM_TIMEOUT", category: "upstream", message: "API request timed out", retryable: true });
  }
  return toOperationError(error, { code: "UPSTREAM_UNAVAILABLE", category: "upstream", message: "API request failed", retryable: true });
}

function statusCategory(status) {
  if (status === 401 || status === 403) return "authorization";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "upstream";
  return "validation";
}

function statusCode(status) {
  return ({ 400: "INVALID_INPUT", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 429: "RATE_LIMITED" })[status] ?? (status >= 500 ? "UPSTREAM_ERROR" : "HTTP_ERROR");
}
