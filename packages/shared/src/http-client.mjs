/**
 * @paridade-risco/shared — HTTP Client
 *
 * Shared HTTP helper for all 3 adapters (CLI, Local MCP, Remote MCP).
 * Uses env vars first, file config as fallback.
 *
 * Config priority:
 *   1. PARIDADE_API_URL / PARIDADE_SESSION_TOKEN / PARIDADE_USER_ID env vars
 *   2. ~/.config/paridade-risco/config.json (written by CLI `login`)
 *
 * Both CLI and MCP adapters share the same config file and endpoint helpers.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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
  const userId = process.env.PARIDADE_USER_ID;

  // File config as fallback when env vars are not set
  if (!sessionToken && existsSync(CONFIG_PATH)) {
    try {
      const fileConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      return {
        apiUrl: fileConfig.apiUrl || apiUrl,
        sessionToken: fileConfig.sessionToken,
        userId: fileConfig.userId,
      };
    } catch {
      // Corrupt file — ignore and return env/defaults
    }
  }

  return { apiUrl, sessionToken, userId };
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
  if (config.userId) headers["x-user-id"] = config.userId;
  return headers;
}

/**
 * GET request to the configured API.
 * Returns { ok, status, data?, error? }.
 */
export async function apiGet(path) {
  try {
    const response = await fetch(buildUrl(path), { headers: buildHeaders() });
    const data = response.ok ? await response.json() : null;
    return {
      ok: response.ok,
      status: response.status,
      data: data ?? undefined,
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

/**
 * POST request to the configured API.
 * Returns { ok, status, data?, error? }.
 */
export async function apiPost(path, body) {
  try {
    const response = await fetch(buildUrl(path), {
      method: "POST",
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = response.ok ? await response.json() : null;
    return {
      ok: response.ok,
      status: response.status,
      data: data ?? undefined,
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