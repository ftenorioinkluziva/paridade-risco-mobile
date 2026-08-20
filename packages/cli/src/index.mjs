#!/usr/bin/env node

/**
 * Paridade de Risco CLI — @paridade-risco/cli
 *
 * CLI for querying the Paridade de Risco API.
 * All output is JSON for machine consumption (agents, scripts).
 *
 * Usage:
 *   PARIDADE_API_KEY=... pr auth configure             Configure API key
 *   pr auth status                                     Validate configured key
 *   pr auth clear                                      Remove local credentials
 *   pr portfolio                                        Portfolio summary
 *   pr prices status                                    Price update status
 *   pr rebalance                                        Rebalance preview
 *   pr list-assets                                      List all assets
 *   pr asset-prices                                     Current asset prices
 *   pr funds-summary                                    Funds summary
 *   pr list-baskets                                     List all baskets
 *   pr basket-detail --id <uuid>                        Basket detail
 *   pr transactions                                     Transaction history
 *   pr config set-api-url <url>                         Set API URL
 *   pr config show                                      Show config (no secrets)
 */

import { legacyCliSessionEnabled, loadConfig, loadOrInitConfig, saveConfig, apiRequestWithContext } from "@paridade-risco/shared/http-client";
import { errorEnvelope, executeCliReadOperation, operationCatalog, toOperationError } from "@paridade-risco/shared/contracts";
import { Command } from "commander";
import { pathToFileURL } from "node:url";

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function printError(message, details) {
  const canonical = details?.operationError ?? toOperationError(details, { code: "COMMAND_FAILED", category: "internal", message, retryable: false });
  console.error(JSON.stringify(errorEnvelope(canonical), null, 2));
  process.exit(1);
}

export async function readApiKeyInput(stdin = process.stdin, env = process.env) {
  const fromEnv = env.PARIDADE_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  if (stdin.isTTY) {
    throw Object.assign(new Error("API key is missing. Set PARIDADE_API_KEY or pipe the key through stdin."), {
      operationError: { code: "API_KEY_MISSING", category: "authorization", message: "API key is missing", retryable: false },
    });
  }
  stdin.setEncoding("utf8");
  let value = "";
  for await (const chunk of stdin) value += chunk;
  const key = value.trim();
  if (!key) return readApiKeyInput({ isTTY: true }, {});
  return key;
}

function authRequest(apiUrl, apiKey, permission, request = apiRequestWithContext) {
  return request("GET", `/api/auth/mcp-token/validate?permission=${permission}`, undefined, undefined, {
    apiUrl, apiKey, consumer: "cli",
  });
}

export function classifyStoredKeyFailure(result, config, now = Date.now()) {
  const expiresAt = config.apiKeyExpiresAt ? Date.parse(config.apiKeyExpiresAt) : Number.NaN;
  if (Number.isFinite(expiresAt) && expiresAt <= now) {
    return { ...result, operationError: { code: "API_KEY_EXPIRED", category: "authorization", message: "API key is expired", retryable: false } };
  }
  if (config.apiKeyVerifiedAt && result.operationError?.code === "API_KEY_INVALID") {
    return { ...result, operationError: { code: "API_KEY_REVOKED", category: "authorization", message: "API key is revoked or no longer available", retryable: false } };
  }
  return result;
}

export async function configureApiKey({ key, config = loadOrInitConfig(), request = apiRequestWithContext, save = saveConfig } = {}) {
  if (!key) throw new Error("API key is required");
  for (const permission of ["read", "sync"]) {
    const result = await authRequest(config.apiUrl, key, permission, request);
    if (!result.ok) throw Object.assign(new Error(result.error || "API key validation failed"), result);
    if (permission === "read") {
      config.apiKeyId = result.data.keyId;
      config.apiKeyExpiresAt = result.data.expiresAt;
    }
  }
  config.apiKey = key;
  config.apiKeyVerifiedAt = new Date().toISOString();
  delete config.sessionToken;
  delete config.userId;
  save(config);
  return { success: true, keyId: config.apiKeyId, expiresAt: config.apiKeyExpiresAt, permissions: ["read", "sync"] };
}

export async function apiKeyStatus({ config = loadConfig(), request = apiRequestWithContext } = {}) {
  if (!config.apiKey) {
    return { ok: false, status: 401, operationError: { code: "API_KEY_MISSING", category: "authorization", message: "API key is missing", retryable: false } };
  }
  const result = await authRequest(config.apiUrl, config.apiKey, "read", request);
  if (!result.ok) return classifyStoredKeyFailure(result, config);
  return { ok: true, data: { configured: true, keyId: result.data.keyId, expiresAt: result.data.expiresAt, permissions: result.data.permissions } };
}

export function clearCredentials(config = loadOrInitConfig(), save = saveConfig) {
  for (const field of ["apiKey", "apiKeyId", "apiKeyExpiresAt", "apiKeyVerifiedAt", "sessionToken", "userId"]) delete config[field];
  save(config);
  return { success: true, message: "Local credentials removed" };
}

async function cmdPortfolio() {
  printJson(await executeCliOperation("portfolio_summary"));
}

async function cmdPricesStatus() {
  printJson(await executeCliOperation("prices_status"));
}

async function cmdRebalance(cash) {
  const input = cash !== undefined ? { cashForOrders: Number(cash) } : {};
  printJson(await executeCliOperation("pluggy_rebalance_preview", input));
}

async function cmdListAssets() {
  printJson(await executeCliOperation("list_assets"));
}

async function cmdAssetPrices() {
  printJson(await executeCliOperation("asset_prices"));
}

async function cmdListBaskets() {
  printJson(await executeCliOperation("list_baskets"));
}

async function cmdActiveBasket() {
  printJson(await executeCliOperation("get_active_basket"));
}

async function cmdBasketDetail(id) {
  printJson(await executeCliOperation("basket_detail", { basketId: id }));
}

async function cmdFinancialOverview(days) {
  const input = days !== undefined ? { days: Number(days) } : {};
  printJson(await executeCliOperation("pluggy_financial_overview", input));
}

async function cmdFinancialHealth(days) {
  const input = days !== undefined ? { days: Number(days) } : {};
  printJson(await executeCliOperation("pluggy_financial_health", input));
}

async function cmdSyncPluggy() {
  printJson(await executeCliOperation("pluggy_trigger_sync"));
}

function defaultCliRequest(path, operation, body) {
  const contract = operationCatalog[operation];
  const method = contract?.method ?? "GET";
  return apiRequestWithContext(method, path, operation, body, { consumer: "cli" });
}

export async function executeCliOperation(name, input = {}, request = defaultCliRequest) {
  return executeCliReadOperation(name, input, request);
}

const program = new Command();

program
  .name("pr")
  .description("Paridade de Risco CLI — query portfolio, prices, and rebalance")
  .version("0.1.0");

const authCmd = program.command("auth").description("Configure and validate scoped API-key authentication");

authCmd.command("configure")
  .description("Validate and store an API key from PARIDADE_API_KEY or stdin")
  .action(async () => {
    try { printJson(await configureApiKey({ key: await readApiKeyInput() })); }
    catch (error) { printError("API key configuration failed", error); }
  });

authCmd.command("status")
  .description("Validate the configured API key without displaying it")
  .action(async () => {
    const result = await apiKeyStatus();
    if (!result.ok) return printError("API key validation failed", result);
    printJson(result.data);
  });

authCmd.command("clear")
  .description("Remove locally stored API key and legacy session")
  .action(() => printJson(clearCredentials()));

program
  .command("portfolio")
  .description("Get portfolio summary")
  .action(async () => {
    try { await cmdPortfolio(); }
    catch (error) { printError("Portfolio command failed", error); }
  });

program
  .command("prices")
  .description("Check price update status")
  .command("status")
  .description("Check price update status for all assets")
  .action(async () => {
    try { await cmdPricesStatus(); }
    catch (error) { printError("Price status command failed", error); }
  });

program
  .command("rebalance")
  .description("Get Pluggy rebalance preview")
  .option("--cash <number>", "Cash amount for orders")
  .action(async (options) => {
    try { await cmdRebalance(options.cash); }
    catch (error) { printError("Rebalance command failed", error); }
  });

program
  .command("list-assets")
  .description("List the 11 strategy assets")
  .action(async () => {
    try { await cmdListAssets(); }
    catch (error) { printError("Command failed", error); }
  });

program
  .command("asset-prices")
  .description("Get current prices for all strategy assets")
  .action(async () => {
    try { await cmdAssetPrices(); }
    catch (error) { printError("Command failed", error); }
  });

program
  .command("list-baskets")
  .description("List all baskets")
  .action(async () => {
    try { await cmdListBaskets(); }
    catch (error) { printError("Command failed", error); }
  });

program
  .command("active-basket")
  .description("Get active basket")
  .action(async () => {
    try { await cmdActiveBasket(); }
    catch (error) { printError("Command failed", error); }
  });

program
  .command("basket-detail")
  .description("Get detail of a specific basket")
  .requiredOption("--id <uuid>", "Basket ID")
  .action(async (options) => {
    try { await cmdBasketDetail(options.id); }
    catch (error) { printError("Command failed", error); }
  });

program
  .command("financial-overview")
  .description("Get Pluggy financial overview")
  .option("--days <number>", "Period in days (default: 90)")
  .action(async (options) => {
    try { await cmdFinancialOverview(options.days); }
    catch (error) { printError("Command failed", error); }
  });

program
  .command("financial-health")
  .description("Get Pluggy financial health status")
  .option("--days <number>", "Period in days (default: 90)")
  .action(async (options) => {
    try { await cmdFinancialHealth(options.days); }
    catch (error) { printError("Command failed", error); }
  });

program
  .command("sync-pluggy")
  .description("Trigger instant sync with Pluggy Open Finance")
  .action(async () => {
    try { await cmdSyncPluggy(); }
    catch (error) { printError("Command failed", error); }
  });

const configCmd = program
  .command("config")
  .description("Manage CLI configuration");

configCmd
  .command("get-api-url")
  .description("Show the configured API URL")
  .action(() => {
    const config = loadOrInitConfig();
    printJson({ apiUrl: config.apiUrl });
  });

configCmd
  .command("set-api-url")
  .description("Set the API URL")
  .argument("<url>", "API base URL")
  .action((url) => {
    const config = loadOrInitConfig();
    config.apiUrl = url.replace(/\/+$/, "");
    saveConfig(config);
    printJson({ success: true, apiUrl: config.apiUrl });
  });

configCmd
  .command("show")
  .description("Show current configuration (without secrets)")
  .action(() => {
    const config = loadOrInitConfig();
    printJson({
      apiUrl: config.apiUrl,
      hasApiKey: !!config.apiKey,
      apiKeyId: config.apiKeyId ?? null,
      apiKeyExpiresAt: config.apiKeyExpiresAt ?? null,
      hasLegacySession: !!config.sessionToken,
      legacySessionEnabled: legacyCliSessionEnabled(),
    });
  });

async function main() {
  try { await program.parseAsync(process.argv); }
  catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    printError(message, error);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
