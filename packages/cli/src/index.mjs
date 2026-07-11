#!/usr/bin/env node

/**
 * Paridade de Risco CLI — @paridade-risco/cli
 *
 * CLI for querying the Paridade de Risco API.
 * All output is JSON for machine consumption (agents, scripts).
 *
 * Usage:
 *   pr login --email <email> --password <password>     Authenticate
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

import { loadOrInitConfig, saveConfig, apiGet, apiPost } from "@paridade-risco/shared/http-client";
import { errorEnvelope, executeCliReadOperation, toOperationError } from "@paridade-risco/shared/contracts";
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

async function cmdLogin(email, password) {
  const result = await apiPost("/api/auth/login", { email, password }, "login");
  if (!result.ok || !result.data) {
    printError("Login failed", result);
    return;
  }

  const config = loadOrInitConfig();
  config.sessionToken = result.data.token;
  config.userId = result.data.user.id;
  saveConfig(config);

  printJson({
    success: true,
    message: `Authenticated as ${email}`,
    userId: result.data.user.id,
  });
}

async function cmdPortfolio() {
  printJson(await executeCliOperation("portfolio_summary"));
}

async function cmdPricesStatus() {
  printJson(await executeCliOperation("prices_status"));
}

async function cmdRebalance() {
  printJson(await executeCliOperation("rebalance_preview"));
}

async function cmdListAssets() {
  printJson(await executeCliOperation("list_assets"));
}

async function cmdAssetPrices() {
  printJson(await executeCliOperation("asset_prices"));
}

async function cmdFundsSummary() {
  printJson(await executeCliOperation("funds_summary"));
}

async function cmdListBaskets() {
  printJson(await executeCliOperation("list_baskets"));
}

async function cmdBasketDetail(id) {
  printJson(await executeCliOperation("basket_detail", { basketId: id }));
}

async function cmdTransactions(limit) {
  const input = limit === undefined ? {} : { limit: Number(limit) };
  printJson(await executeCliOperation("transaction_history", input));
}

export async function executeCliOperation(name, input = {}, request = apiGet) {
  return executeCliReadOperation(name, input, request);
}

const program = new Command();

program
  .name("pr")
  .description("Paridade de Risco CLI — query portfolio, prices, and rebalance")
  .version("0.1.0");

program
  .command("login")
  .description("Authenticate with the API")
  .requiredOption("--email <email>", "Account email")
  .requiredOption("--password <password>", "Account password")
  .action(async (options) => {
    try { await cmdLogin(options.email, options.password); }
    catch (error) { printError("Login failed", error); }
  });

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
  .description("Get rebalance preview")
  .action(async () => {
    try { await cmdRebalance(); }
    catch (error) { printError("Rebalance command failed", error); }
  });

program
  .command("list-assets")
  .description("List all available assets")
  .action(async () => {
    try { await cmdListAssets(); }
    catch (error) { printError("Command failed", error); }
  });

program
  .command("asset-prices")
  .description("Get current prices for all assets")
  .action(async () => {
    try { await cmdAssetPrices(); }
    catch (error) { printError("Command failed", error); }
  });

program
  .command("funds-summary")
  .description("Get summary of all funds")
  .action(async () => {
    try { await cmdFundsSummary(); }
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
  .command("basket-detail")
  .description("Get detail of a specific basket")
  .requiredOption("--id <uuid>", "Basket ID")
  .action(async (options) => {
    try { await cmdBasketDetail(options.id); }
    catch (error) { printError("Command failed", error); }
  });

program
  .command("transactions")
  .description("Get recent transaction history")
  .option("--limit <number>", "Maximum transactions to return (1-100)")
  .action(async (options) => {
    try { await cmdTransactions(options.limit); }
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
      hasSessionToken: !!config.sessionToken,
      hasUserId: !!config.userId,
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
