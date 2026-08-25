#!/usr/bin/env tsx
import "dotenv/config";

import cron from "node-cron";

import { getFinancialDataFetcher } from "../lib/financialDataFetcher";
import { getStrategicEtfTickersForSchedule, isB3FinalCaptureWindow, isB3TradingSession, monthlyCallEstimate, STRATEGIC_ETF_TICKERS } from "../lib/market-data";
import {
  buildQuoteQuotaSnapshot,
  classifyPluggyOperationalError,
  getErrorCode,
  getErrorStatus,
  logOperationalEvent,
} from "../lib/operational-observability";

const CRON_QUOTES = process.env.PRICE_SCHEDULER_CRON_QUOTES ?? "*/7 10-16 * * 1-5";
const CRON_FINAL_CAPTURE = process.env.PRICE_SCHEDULER_CRON_FINAL_CAPTURE ?? "30 17 * * 1-5";
const TIMEZONE = process.env.PRICE_SCHEDULER_TIMEZONE ?? "America/Sao_Paulo";

let isJobRunning = false;
let observedQuoteCalls = 0;

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
    logOperationalEvent("quote_scheduler_skipped", { scheduler: "prices", reason: "LOCKED", trigger: reason });
    return;
  }

  isJobRunning = true;
  const startedAt = Date.now();
  try {
    console.log(`[scheduler] Starting strategic quote update (${reason}) at ${new Date().toISOString()} planned=${tickers.length}`);
    logOperationalEvent("quote_scheduler_cycle_started", {
      scheduler: "prices",
      trigger: reason,
      universe: tickers,
      planned: tickers.length,
      intervalMinutes: 7,
    });
    const fetcher = await getFinancialDataFetcher();
    const result = await fetcher.updateStrategicQuotes(new Date(), tickers);
    const successful = result.results.filter((row) => row.success).length;
    const fallbacks = result.results.filter((row) => row.source === "YAHOO_FINANCE").length;
    const skipped = result.results.filter((row) => row.skipped > 0).length;
    const failed = result.results.length - successful;
    observedQuoteCalls += result.results.length;
    const quota = buildQuoteQuotaSnapshot({
      observedCalls: observedQuoteCalls,
      monthlyQuota: Number(process.env.PRICE_SCHEDULER_MONTHLY_QUOTA ?? 15_000),
    });
    console.log(`[scheduler] Strategic quote update finished. planned=${tickers.length}, executed=${result.results.length}, successful=${successful}, failed=${result.results.length - successful}, fallbacks=${fallbacks}, retries=0, durationMs=${Date.now() - startedAt}`);
    logOperationalEvent("quote_scheduler_cycle_finished", {
      scheduler: "prices",
      trigger: reason,
      planned: tickers.length,
      executed: result.results.length,
      successful,
      failed,
      skipped,
      fallbacks,
      retries: 0,
      durationMs: Date.now() - startedAt,
      quota,
    });
  } catch (error) {
    console.error("[scheduler] Strategic quote update failed.");
    const status = getErrorStatus(error);
    const code = getErrorCode(error);
    logOperationalEvent("quote_scheduler_failed", {
      scheduler: "prices",
      trigger: reason,
      category: classifyPluggyOperationalError({ status, code, unavailable: status === 0 || (status !== undefined && status >= 500) || code.includes("UNAVAILABLE") }),
      code,
    });
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
  const quota = Number(process.env.PRICE_SCHEDULER_MONTHLY_QUOTA ?? 15_000);
  const estimate22 = monthlyCallEstimate();
  const estimate25 = monthlyCallEstimate({ tradingDays: 25 });
  console.log(`[scheduler] monthly quote budget: quota=${quota}, planned22=${estimate22}, planned25=${estimate25}, margin25=${quota - estimate25}, intervalMinutes=7, retries=0`);
  logOperationalEvent("quote_scheduler_started", {
    scheduler: "prices",
    sessionCron: CRON_QUOTES,
    finalCaptureCron: CRON_FINAL_CAPTURE,
    timezone: TIMEZONE,
    universe: STRATEGIC_ETF_TICKERS,
    intervalMinutes: 7,
  });
  logOperationalEvent("quote_quota_projection", {
    scheduler: "prices",
    quota: buildQuoteQuotaSnapshot({ observedCalls: observedQuoteCalls, monthlyQuota: quota, tradingDays: 22 }),
    projection25: buildQuoteQuotaSnapshot({ observedCalls: observedQuoteCalls, monthlyQuota: quota }),
  });
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
