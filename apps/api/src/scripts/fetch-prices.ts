#!/usr/bin/env tsx
/**
 * CLI script to test price fetching locally
 * Usage: tsx fetch-prices.ts [--action update-all|update-one] [--ticker TICKER] [--incremental]
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { getFinancialDataFetcher } from "../lib/financialDataFetcher";
import { db } from "../db/client";
import { historicalPrices } from "../db/schema";

async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || "update-all";
  const tickerIndex = args.indexOf("--ticker");
  const ticker = tickerIndex > -1 ? args[tickerIndex + 1] : undefined;
  const incremental = !args.includes("--no-incremental");

  console.log("📊 Financial Data Fetcher CLI");
  console.log(`Action: ${action}`);
  if (ticker) console.log(`Ticker: ${ticker}`);
  console.log(`Incremental: ${incremental}`);
  console.log("");

  const fetcher = await getFinancialDataFetcher();

  try {
    if (action === "update-all") {
      console.log("🔄 Updating all active assets...");
      const result = await fetcher.updateAllAssets(incremental);
      console.log(`✓ ${result.message}`);
      console.log("");
      console.log("Results:");
      for (const r of result.results) {
        console.log(`  ${r.ticker}: ${r.inserted} prices`);
      }
    } else if (action === "update-one") {
      if (!ticker) {
        console.error("❌ Error: --ticker parameter required for update-one");
        process.exit(1);
      }
      console.log(`🔄 Updating ${ticker}...`);
      const result = await fetcher.updateSpecificAsset(ticker);
      console.log(result.success ? `✓ ${result.message}` : `❌ ${result.message}`);
    } else if (action === "status") {
      console.log("📍 Checking update status...");
      const status = await fetcher.getUpdateStatus();
      console.log("");
      for (const s of status) {
        const lastUpdateStr = s.lastUpdate
          ? new Date(s.lastUpdate).toLocaleDateString("pt-BR")
          : "Never";
        const staleStr = s.staleDays >= 0 ? `${s.staleDays} days` : "No data";
        console.log(`  ${s.ticker}: ${lastUpdateStr} (${staleStr})`);
      }
    } else if (action === "count") {
      console.log("📈 Counting prices in database...");
      const result = await db
        .select({
          assetId: historicalPrices.assetId,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(historicalPrices)
        .groupBy(historicalPrices.assetId);

      console.log("");
      let total = 0;
      for (const r of result) {
        console.log(`  Asset ${r.assetId}: ${r.count} prices`);
        total += r.count;
      }
      console.log(`  Total: ${total} prices`);
    } else {
      console.error(`❌ Unknown action: ${action}`);
      console.error("");
      console.error("Available actions:");
      console.error("  update-all            - Update all active assets");
      console.error("  update-one --ticker X - Update specific ticker");
      console.error("  status                - Show update status");
      console.error("  count                 - Count prices in database");
      process.exit(1);
    }

    console.log("");
    console.log("✨ Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
