import cron from "node-cron";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { closeDb, db } from "../db/client";
import { PluggyClient } from "../lib/pluggy/client";
import { getUserPluggyConfig, readPluggyConfig, type PluggyConfig } from "../lib/pluggy/config";
import { PluggySyncInProgressError, syncConfiguredPluggyItem } from "../lib/pluggy/sync";

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
        console.warn(`[pluggy-scheduler] No credentials found for specified user ${specifiedUserId}`);
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
    } catch (err) {
      console.warn(`[pluggy-scheduler] Skipping user ${cred.userId}: invalid credentials`, err instanceof Error ? err.message : err);
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
    return;
  }

  for (const { userId, config } of userConfigs) {
    try {
      const summary = await syncConfiguredPluggyItem({
        client: new PluggyClient(config),
        database: db,
        userId,
        config,
      });
      console.log(`[pluggy-scheduler] ${trigger} sync succeeded for user ${userId}: run=${summary.syncRunId} investments=${summary.investments} accounts=${summary.accounts} transactions=${summary.transactions}`);
    } catch (error) {
      if (error instanceof PluggySyncInProgressError) {
        console.log(`[pluggy-scheduler] ${trigger} sync skipped for user ${userId}: another run is active (${error.syncRunId})`);
        continue;
      }
      console.error(`[pluggy-scheduler] ${trigger} sync failed for user ${userId}:`, error instanceof Error ? error.message : error);
    }
  }
}

async function main() {
  console.log(`[pluggy-scheduler] starting: cron=${schedule} timezone=${timezone}`);
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
