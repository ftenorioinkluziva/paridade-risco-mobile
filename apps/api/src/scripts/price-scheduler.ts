#!/usr/bin/env tsx
import "dotenv/config";

import cron from "node-cron";

import { getFinancialDataFetcher } from "../lib/financialDataFetcher";
import { getStrategicEtfTickersForSchedule, isB3FinalCaptureWindow, isB3TradingSession, monthlyCallEstimate, STRATEGIC_ETF_TICKERS } from "../lib/market-data";

const CRON_QUOTES = process.env.PRICE_SCHEDULER_CRON_QUOTES ?? "*/10 10-16 * * 1-5";
const CRON_FINAL_CAPTURE = process.env.PRICE_SCHEDULER_CRON_FINAL_CAPTURE ?? "30 17 * * 1-5";
const TIMEZONE = process.env.PRICE_SCHEDULER_TIMEZONE ?? "America/Sao_Paulo";

let isJobRunning = false;

function parseArgs() {
  return { runOnStart: process.argv.slice(2).includes("--run-on-start") };
}

export function shouldRunStrategicQuotes(now = new Date()): boolean {
  return isB3TradingSession(now) || isB3FinalCaptureWindow(now);
}

async function executeStrategicUpdate(
  reason: "session" | "final",
  tickers: readonly (typeof STRATEGIC_ETF_TICKERS[number])[] = STRATEGIC_ETF_TICKERS,
): Promise<void> {
  if (isJobRunning) {
    console.log(`[scheduler] Skipping ${reason} update: another update is already running.`);
    return;
  }

  isJobRunning = true;
  const startedAt = Date.now();
  try {
    console.log(`[scheduler] Starting strategic quote update (${reason}) at ${new Date().toISOString()}`);
    const fetcher = await getFinancialDataFetcher();
    const result = await fetcher.updateStrategicQuotes(new Date(), tickers);
    const successful = result.results.filter((row) => row.success).length;
    console.log(`[scheduler] Strategic quote update finished. assets=${result.results.length}, successful=${successful}, failed=${result.results.length - successful}, durationMs=${Date.now() - startedAt}`);
  } catch {
    console.error("[scheduler] Strategic quote update failed.");
  } finally {
    isJobRunning = false;
  }
}

function scheduleJobs(): void {
  if (!cron.validate(CRON_QUOTES)) throw new Error(`Invalid PRICE_SCHEDULER_CRON_QUOTES: ${CRON_QUOTES}`);
  if (!cron.validate(CRON_FINAL_CAPTURE)) throw new Error(`Invalid PRICE_SCHEDULER_CRON_FINAL_CAPTURE: ${CRON_FINAL_CAPTURE}`);

  cron.schedule(CRON_QUOTES, () => {
    const now = new Date();
    if (isB3TradingSession(now)) void executeStrategicUpdate("session", getStrategicEtfTickersForSchedule(now));
  }, { timezone: TIMEZONE });

  cron.schedule(CRON_FINAL_CAPTURE, () => {
    if (isB3FinalCaptureWindow(new Date())) void executeStrategicUpdate("final");
  }, { timezone: TIMEZONE });

  console.log("[scheduler] Strategic market data scheduler started.");
  console.log(`[scheduler] session cron: ${CRON_QUOTES}`);
  console.log(`[scheduler] final capture cron: ${CRON_FINAL_CAPTURE}`);
  console.log(`[scheduler] timezone: ${TIMEZONE}`);
  console.log(`[scheduler] estimated monthly calls (22 sessions): ${monthlyCallEstimate()}`);
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
  registerShutdownHandlers();
  scheduleJobs();
  const now = new Date();
  if (parseArgs().runOnStart && shouldRunStrategicQuotes(now)) {
    const isFinal = isB3FinalCaptureWindow(now);
    void executeStrategicUpdate(isFinal ? "final" : "session", isFinal ? STRATEGIC_ETF_TICKERS : getStrategicEtfTickersForSchedule(now));
  }
}

main();
