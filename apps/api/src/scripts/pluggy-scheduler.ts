import cron from "node-cron";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { closeDb, db } from "../db/client";
import { PluggyClient } from "../lib/pluggy/client";
import { getUserPluggyConfig, readPluggyConfig, type PluggyConfig } from "../lib/pluggy/config";
import { listPluggyConnectionsForFallback } from "../lib/pluggy/repository";
import { isPluggyFallbackDue } from "../lib/pluggy/fallback-policy";
import { buildPluggyFreshness } from "../lib/pluggy/freshness-rules";
import { PluggySyncInProgressError, syncConfiguredPluggyItem } from "../lib/pluggy/sync";
import {
  classifyPluggyOperationalError,
  getErrorCode,
  getErrorStatus,
  logOperationalEvent,
  operationalCorrelationId,
} from "../lib/operational-observability";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../../../../.env") });

const specifiedUserId = process.env.PLUGGY_SYNC_USER_ID?.trim();
const schedule = process.env.PLUGGY_SYNC_CRON?.trim() || "*/30 * * * *";
const timezone = process.env.PLUGGY_SYNC_TIMEZONE?.trim() || "America/Sao_Paulo";
const runOnStart = process.env.PLUGGY_SYNC_RUN_ON_START === "true" || process.argv.includes("--run-on-start");

async function resolveUserConfigs(): Promise<Array<{ userId: string; config: PluggyConfig }>> {
  const results: Array<{ userId: string; config: PluggyConfig }> = [];

  if (specifiedUserId) {
    try {
      const config = await getUserPluggyConfig(specifiedUserId, db);
      results.push({ userId: specifiedUserId, config });
      return results;
    } catch {
      try {
        const config = readPluggyConfig();
        results.push({ userId: specifiedUserId, config });
        return results;
      } catch {
        console.warn("[pluggy-scheduler] No credentials found for specified user");
        return results;
      }
    }
  }

  // Multiusuário: busca todos os usuários com credenciais cadastradas no banco
  const credentialsList = await db.query.userPluggyCredentials.findMany();
  for (const cred of credentialsList) {
    try {
      const config = await getUserPluggyConfig(cred.userId, db);
      results.push({ userId: cred.userId, config });
    } catch {
      console.warn("[pluggy-scheduler] Skipping user with invalid credentials");
      logOperationalEvent("pluggy_sync_failed", {
        trigger: "configuration",
        correlationId: operationalCorrelationId(cred.userId),
        category: "UNAVAILABLE",
        code: "INVALID_CREDENTIALS",
      });
    }
  }

  // Se nenhum usuário cadastrado no banco mas houver env vars globais
  if (results.length === 0) {
    try {
      const config = readPluggyConfig();
      if (specifiedUserId) {
        results.push({ userId: specifiedUserId, config });
      }
    } catch {
      // Nem banco nem env vars globais configurados
    }
  }

  return results;
}

async function runSync(trigger: "startup" | "schedule") {
  const userConfigs = await resolveUserConfigs();
  if (userConfigs.length === 0) {
    console.log(`[pluggy-scheduler] ${trigger} skipped: no users with configured Pluggy credentials found.`);
    logOperationalEvent("pluggy_scheduler_cycle_finished", {
      scheduler: "pluggy-fallback",
      trigger,
      planned: 0,
      executed: 0,
      skipped: 0,
      succeeded: 0,
      failed: 0,
      concurrency: 1,
      fallbackIntervalMinutes: 30,
      reason: "NO_CONFIGURED_USERS",
    });
    return;
  }

  const connections = await listPluggyConnectionsForFallback(db);
  logOperationalEvent("pluggy_scheduler_cycle_started", {
    scheduler: "pluggy-fallback",
    trigger,
    planned: userConfigs.length,
    configuredConnections: connections.length,
    fallbackIntervalMinutes: 30,
    concurrency: 1,
  });
  let executed = 0;
  let skipped = 0;
  let succeeded = 0;
  let failed = 0;
  for (const { userId, config } of userConfigs) {
    const connection = connections.find((candidate) => candidate.userId === userId && candidate.itemId === config.sandboxItemId);
    const freshness = buildPluggyFreshness({
      latestObservedAt: null,
      latestSyncAt: connection?.lastSyncAt ?? null,
      latestSyncStatus: connection?.lastSyncStatus ?? null,
      staleAfterMinutes: 30,
    });
    logOperationalEvent("pluggy_freshness_observed", {
      scheduler: "pluggy-fallback",
      trigger,
      correlationId: operationalCorrelationId(userId, config.sandboxItemId),
      status: freshness.status,
      ageMinutes: freshness.ageMinutes,
      staleAfterMinutes: freshness.staleAfterMinutes,
      lastSyncStatus: freshness.latestSyncStatus,
      fallbackIntervalMinutes: 30,
    });
    if (trigger === "schedule" && connection && !isPluggyFallbackDue({ lastSyncAt: connection.lastSyncAt, lastSyncStatus: connection.lastSyncStatus, now: new Date() })) {
      skipped += 1;
      logOperationalEvent("pluggy_fallback_skipped", {
        scheduler: "pluggy-fallback",
        trigger,
        correlationId: operationalCorrelationId(userId, config.sandboxItemId),
        reason: "FRESH",
        lastSyncStatus: connection.lastSyncStatus,
        fallbackIntervalMinutes: 30,
      });
      continue;
    }
    executed += 1;
    try {
      const summary = await syncConfiguredPluggyItem({
        client: new PluggyClient(config),
        database: db,
        userId,
        config,
      });
      succeeded += 1;
      console.log(`[pluggy-scheduler] ${trigger} sync succeeded: correlation=${operationalCorrelationId(userId, config.sandboxItemId)} investments=${summary.investments} accounts=${summary.accounts} transactions=${summary.transactions} loans=${summary.loans}`);
      logOperationalEvent("pluggy_sync_finished", {
        scheduler: "pluggy-fallback",
        trigger,
        correlationId: operationalCorrelationId(userId, config.sandboxItemId),
        syncRunCorrelationId: operationalCorrelationId(summary.syncRunId),
        status: "SUCCEEDED",
        investments: summary.investments,
        accounts: summary.accounts,
        transactions: summary.transactions,
        loans: summary.loans,
        loansUnavailable: summary.loansUnavailable,
      });
    } catch (error) {
      if (error instanceof PluggySyncInProgressError) {
        skipped += 1;
        console.log(`[pluggy-scheduler] ${trigger} sync skipped: correlation=${operationalCorrelationId(userId, config.sandboxItemId)} reason=already_running`);
        logOperationalEvent("pluggy_fallback_skipped", {
          scheduler: "pluggy-fallback",
          trigger,
          correlationId: operationalCorrelationId(userId, config.sandboxItemId),
          reason: "LOCKED",
          fallbackIntervalMinutes: 30,
        });
        continue;
      }
      failed += 1;
      console.error(`[pluggy-scheduler] ${trigger} sync failed: reason=${getErrorCode(error)}`);
      const status = getErrorStatus(error);
      const code = getErrorCode(error);
      logOperationalEvent("pluggy_sync_failed", {
        scheduler: "pluggy-fallback",
        trigger,
        correlationId: operationalCorrelationId(userId, config.sandboxItemId),
        category: classifyPluggyOperationalError({ status, code, unavailable: status === 0 || (status !== undefined && status >= 500) || code.includes("UNAVAILABLE") }),
        code,
        status: status ?? null,
      });
    }
  }
  console.log(`[pluggy-scheduler] ${trigger} summary: planned=${userConfigs.length} executed=${executed} skipped=${skipped} succeeded=${succeeded} failed=${failed} concurrency=1`);
  logOperationalEvent("pluggy_scheduler_cycle_finished", {
    scheduler: "pluggy-fallback",
    trigger,
    planned: userConfigs.length,
    executed,
    skipped,
    succeeded,
    failed,
    concurrency: 1,
    fallbackIntervalMinutes: 30,
  });
}

async function main() {
  console.log(`[pluggy-scheduler] starting: cron=${schedule} timezone=${timezone}`);
  logOperationalEvent("pluggy_scheduler_started", {
    scheduler: "pluggy-fallback",
    cron: schedule,
    timezone,
    fallbackIntervalMinutes: 30,
    concurrency: 1,
  });
  if (runOnStart) await runSync("startup");
  const task = cron.schedule(schedule, () => { void runSync("schedule"); }, { timezone });
  console.log(`[pluggy-scheduler] running and waiting for scheduled triggers.`);

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
