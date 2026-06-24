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
 *   pr prices update all [--full]                       Trigger full update
 *   pr prices update one --ticker <ticker> [--full]     Update single asset
 *   pr rebalance                                        Rebalance preview
 *   pr config set-api-url <url>                         Set API URL
 *   pr config show                                      Show config (no secrets)
 */

import { loadOrInitConfig, saveConfig, apiGet, apiPost } from "@paridade-risco/shared/http-client";
import { Command } from "commander";

// ─── JSON Output ─────────────────────────────────────────────────────────────

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function printError(message, details) {
  const output = { success: false, error: message, details: details ?? undefined };
  console.log(JSON.stringify(output, null, 2));
  process.exit(1);
}

// ─── Commands ────────────────────────────────────────────────────────────────

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
  if (!result.ok) {
    printError("Failed to fetch portfolio", { status: result.status, error: result.error });
    return;
  }
  printJson({ success: true, data: result.data });
}

async function cmdPricesStatus() {
  const result = await apiGet("/api/admin/prices");
  if (!result.ok) {
    printError("Failed to fetch price status", { status: result.status, error: result.error });
    return;
  }
  printJson({ success: true, data: result.data });
}

async function cmdPricesUpdateAll(incremental) {
  const body = { action: "update-all", incremental };
  const result = await apiPost("/api/admin/prices", body);
  if (!result.ok) {
    printError("Failed to trigger price update", { status: result.status, error: result.error });
    return;
  }
  printJson({ success: true, data: result.data });
}

async function cmdPricesUpdateOne(ticker, incremental) {
  const body = { action: "update-one", ticker, incremental };
  const result = await apiPost("/api/admin/prices", body);
  if (!result.ok) {
    printError("Failed to update price", { status: result.status, ticker, error: result.error });
    return;
  }
  printJson({ success: true, data: result.data });
}

async function cmdRebalance() {
  const result = await apiGet("/api/rebalance/preview");
  if (!result.ok) {
    printError("Failed to fetch rebalance preview", { status: result.status, error: result.error });
    return;
  }
  printJson({ success: true, data: result.data });
}

// ─── CLI Setup ───────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("pr")
  .description("Paridade de Risco CLI — query portfolio, prices, and rebalance")
  .version("0.1.0");

// login
program
  .command("login")
  .description("Authenticate with the API")
  .requiredOption("--email <email>", "Account email")
  .requiredOption("--password <password>", "Account password")
  .action(async (options) => {
    try {
      await cmdLogin(options.email, options.password);
    } catch (error) {
      printError("Login failed", error);
    }
  });

// portfolio
program
  .command("portfolio")
  .description("Get portfolio summary")
  .action(async () => {
    try {
      await cmdPortfolio();
    } catch (error) {
      printError("Portfolio command failed", error);
    }
  });

// prices
const pricesCmd = program
  .command("prices")
  .description("Manage price data");

pricesCmd
  .command("status")
  .description("Check price update status for all assets")
  .action(async () => {
    try {
      await cmdPricesStatus();
    } catch (error) {
      printError("Price status command failed", error);
    }
  });

const updateCmd = pricesCmd
  .command("update")
  .description("Trigger price updates");

updateCmd
  .command("all")
  .description("Update prices for all active assets")
  .option("--full", "Full refresh (not incremental)", false)
  .action(async (options) => {
    try {
      await cmdPricesUpdateAll(!options.full);
    } catch (error) {
      printError("Price update command failed", error);
    }
  });

updateCmd
  .command("one")
  .description("Update prices for a single asset")
  .requiredOption("--ticker <ticker>", "Asset ticker (e.g. IFRM11)")
  .option("--full", "Full refresh (not incremental)", false)
  .action(async (options) => {
    try {
      await cmdPricesUpdateOne(options.ticker.toUpperCase(), !options.full);
    } catch (error) {
      printError("Price update command failed", error);
    }
  });

// rebalance
program
  .command("rebalance")
  .description("Get rebalance preview")
  .action(async () => {
    try {
      await cmdRebalance();
    } catch (error) {
      printError("Rebalance command failed", error);
    }
  });

// config
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

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    printError(message, error);
  }
}

main();