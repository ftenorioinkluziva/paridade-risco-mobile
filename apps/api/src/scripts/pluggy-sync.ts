import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PluggyClient } from "../lib/pluggy/client";
import { readPluggyConfig } from "../lib/pluggy/config";
import { syncPluggyItem } from "../lib/pluggy/sync";
import { closeDb, db } from "../db/client";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../../../../.env") });

async function main() {
  const config = readPluggyConfig();
  const userId = process.env.PLUGGY_SYNC_USER_ID?.trim();
  if (!userId) throw new Error("PLUGGY_SYNC_USER_ID is required for pluggy-sync");
  if (!config.sandboxItemId) throw new Error("PLUGGY_SANDBOX_ITEM_ID is required for pluggy-sync");

  const summary = await syncPluggyItem({
    client: new PluggyClient(config),
    database: db,
    userId,
    itemId: config.sandboxItemId,
    config,
  });

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Pluggy sync failed";
  console.error(message);
  process.exitCode = 1;
}).finally(() => closeDb());
