import cron from "node-cron";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { closeDb, db } from "../db/client";
import { PluggyClient } from "../lib/pluggy/client";
import { readPluggyConfig } from "../lib/pluggy/config";
import { PluggySyncInProgressError, syncConfiguredPluggyItem } from "../lib/pluggy/sync";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../../../../.env") });

const userId = process.env.PLUGGY_SYNC_USER_ID?.trim();
const schedule = process.env.PLUGGY_SYNC_CRON?.trim() || "*/30 * * * *";
const timezone = process.env.PLUGGY_SYNC_TIMEZONE?.trim() || "America/Sao_Paulo";
const runOnStart = process.env.PLUGGY_SYNC_RUN_ON_START === "true" || process.argv.includes("--run-on-start");

async function runSync(trigger: "startup" | "schedule") {
  if (!userId) throw new Error("PLUGGY_SYNC_USER_ID is required for pluggy-scheduler");
  const config = readPluggyConfig();

  try {
    const summary = await syncConfiguredPluggyItem({
      client: new PluggyClient(config),
      database: db,
      userId,
      config,
    });
    console.log(`[pluggy-scheduler] ${trigger} sync succeeded: run=${summary.syncRunId} investments=${summary.investments} accounts=${summary.accounts} transactions=${summary.transactions}`);
  } catch (error) {
    if (error instanceof PluggySyncInProgressError) {
      console.log(`[pluggy-scheduler] ${trigger} sync skipped: another run is active (${error.syncRunId})`);
      return;
    }
    console.error(`[pluggy-scheduler] ${trigger} sync failed:`, error instanceof Error ? error.message : error);
  }
}

async function main() {
  if (runOnStart) await runSync("startup");
  const task = cron.schedule(schedule, () => { void runSync("schedule"); }, { timezone });
  console.log(`[pluggy-scheduler] started: cron=${schedule} timezone=${timezone}`);

  const shutdown = async (signal: string) => {
    task.stop();
    console.log(`[pluggy-scheduler] received ${signal}, stopping.`);
    await closeDb();
    process.exit(0);
  };
  process.on("SIGINT", () => { void shutdown("SIGINT"); });
  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
}

main().catch(async (error: unknown) => {
  console.error("[pluggy-scheduler] fatal:", error instanceof Error ? error.message : error);
  await closeDb();
  process.exitCode = 1;
});
