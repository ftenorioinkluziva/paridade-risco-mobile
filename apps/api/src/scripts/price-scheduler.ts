#!/usr/bin/env tsx
import "dotenv/config";

import cron from "node-cron";

import { getFinancialDataFetcher } from "../lib/financialDataFetcher";

type SchedulerMode = "incremental" | "full";

const CRON_INCREMENTAL = process.env.PRICE_SCHEDULER_CRON_INCREMENTAL ?? "0 18 * * 1-5";
const CRON_FULL = process.env.PRICE_SCHEDULER_CRON_FULL ?? "0 8 * * 1";
const TIMEZONE = process.env.PRICE_SCHEDULER_TIMEZONE ?? "America/Sao_Paulo";

let isJobRunning = false;

function parseArgs() {
  const args = process.argv.slice(2);

  return {
    runOnStart: args.includes("--run-on-start"),
  };
}

async function executeUpdate(mode: SchedulerMode): Promise<void> {
  if (isJobRunning) {
    console.log(`[scheduler] Skipping ${mode} job: another update is already running.`);
    return;
  }

  isJobRunning = true;
  const startedAt = Date.now();

  try {
    console.log(`[scheduler] Starting ${mode} update at ${new Date().toISOString()}`);

    const fetcher = await getFinancialDataFetcher();
    const result = await fetcher.updateAllAssets(mode === "incremental");
    const insertedTotal = result.results.reduce((sum, row) => sum + row.inserted, 0);
    const updatedTotal = result.results.reduce((sum, row) => sum + row.updated, 0);
    const skippedTotal = result.results.reduce((sum, row) => sum + row.skipped, 0);

    console.log(
      `[scheduler] ${mode} update finished. assets=${result.results.length}, inserted=${insertedTotal}, updated=${updatedTotal}, skipped=${skippedTotal}, durationMs=${Date.now() - startedAt}`,
    );
  } catch (error) {
    console.error(`[scheduler] ${mode} update failed:`, error);
  } finally {
    isJobRunning = false;
  }
}

function startScheduler(runOnStart: boolean): void {
  if (!cron.validate(CRON_INCREMENTAL)) {
    throw new Error(`Invalid PRICE_SCHEDULER_CRON_INCREMENTAL: ${CRON_INCREMENTAL}`);
  }

  if (!cron.validate(CRON_FULL)) {
    throw new Error(`Invalid PRICE_SCHEDULER_CRON_FULL: ${CRON_FULL}`);
  }

  cron.schedule(
    CRON_INCREMENTAL,
    () => {
      void executeUpdate("incremental");
    },
    { timezone: TIMEZONE },
  );

  cron.schedule(
    CRON_FULL,
    () => {
      void executeUpdate("full");
    },
    { timezone: TIMEZONE },
  );

  console.log("[scheduler] Price scheduler started.");
  console.log(`[scheduler] incremental cron: ${CRON_INCREMENTAL}`);
  console.log(`[scheduler] full cron: ${CRON_FULL}`);
  console.log(`[scheduler] timezone: ${TIMEZONE}`);

  if (runOnStart) {
    void executeUpdate("incremental");
  }
}

function registerShutdownHandlers(): void {
  const stop = (signal: string) => {
    console.log(`[scheduler] Received ${signal}, stopping scheduler.`);
    process.exit(0);
  };

  process.on("SIGINT", () => stop("SIGINT"));
  process.on("SIGTERM", () => stop("SIGTERM"));
}

function main(): void {
  const { runOnStart } = parseArgs();
  registerShutdownHandlers();
  startScheduler(runOnStart);
}

main();
