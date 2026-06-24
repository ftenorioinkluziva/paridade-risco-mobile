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
import { Command } from "commander";

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function printError(message, details) {
  const output = { success: false, error: message, details: details ?? undefined };
  console.log(JSON.stringify(output, null, 2));
  process.exit(1);
}

async function cmdLogin(email, password) {
  const result = await apiPost("/api/auth/login", { email, password });
  if (!result.ok || !result.data) {
    printError("Login failed", { status: result.status, error: result.error });
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
  const result = await apiGet("/api/portfolio/summary");
  if (!result.ok) printError("Failed to fetch portfolio", { status: result.status, error: result.error });
  else printJson({ success: true, data: result.data });
}

async function cmdPricesStatus() {
  const result = await apiGet("/api/admin/prices");
  if (!result.ok) printError("Failed to fetch price status", { status: result.status, error: result.error });
  else printJson({ success: true, data: result.data });
}

async function cmdRebalance() {
  const result = await apiGet("/api/rebalance/preview");
  if (!result.ok) printError("Failed to fetch rebalance preview", { status: result.status, error: result.error });
  else printJson({ success: true, data: result.data });
}

async function cmdListAssets() {
  const result = await apiGet("/api/assets");
  if (!result.ok) printError("Failed to fetch assets", { status: result.status, error: result.error });
  else printJson({ success: true, data: result.data });
}

async function cmdAssetPrices() {
  const result = await apiGet("/api/assets/prices");
  if (!result.ok) printError("Failed to fetch asset prices", { status: result.status, error: result.error });
  else printJson({ success: true, data: result.data });
}

async function cmdFundsSummary() {
  const result = await apiGet("/api/funds");
  if (!result.ok) printError("Failed to fetch funds", { status: result.status, error: result.error });
  else printJson({ success: true, data: result.data });
}

async function cmdListBaskets() {
  const result = await apiGet("/api/baskets");
  if (!result.ok) printError("Failed to fetch baskets", { status: result.status, error: result.error });
  else printJson({ success: true, data: result.data });
}

async function cmdBasketDetail(id) {
  const result = await apiGet(`/api/baskets/${id}`);
  if (!result.ok) printError("Failed to fetch basket detail", { status: result.status, error: result.error });
  else printJson({ success: true, data: result.data });
}

async function cmdTransactions() {
  const result = await apiGet("/api/transactions");
  if (!result.ok) printError("Failed to fetch transactions", { status: result.status, error: result.error });
  else printJson({ success: true, data: result.data });
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
  .action(async () => {
    try { await cmdTransactions(); }
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

main();
