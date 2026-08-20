import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PluggyClient } from "../lib/pluggy/client";
import { getUserPluggyConfig, readPluggyConfig } from "../lib/pluggy/config";
import { syncConfiguredPluggyItem } from "../lib/pluggy/sync";
import { closeDb, db } from "../db/client";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../../../../.env") });

async function main() {
  const userArgIndex = process.argv.indexOf("--user");
  let userId = userArgIndex !== -1 && process.argv[userArgIndex + 1]
    ? process.argv[userArgIndex + 1].trim()
    : process.env.PLUGGY_SYNC_USER_ID?.trim();

  if (!userId) {
    const firstUser = await db.query.userPluggyCredentials.findFirst();
    if (firstUser) userId = firstUser.userId;
  }
  if (!userId) throw new Error("Nenhum usuário com credenciais Pluggy encontrado no banco e PLUGGY_SYNC_USER_ID não foi informado");

  let config;
  try {
    config = await getUserPluggyConfig(userId, db);
  } catch {
    config = readPluggyConfig();
  }

  const summary = await syncConfiguredPluggyItem({
    client: new PluggyClient(config),
    database: db,
    userId,
    config,
  });

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Pluggy sync failed";
  console.error(message);
  process.exitCode = 1;
}).finally(() => closeDb());
