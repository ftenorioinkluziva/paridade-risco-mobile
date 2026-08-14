import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../../../../.env") });

async function main() {
  const userId = process.env.PLUGGY_SYNC_USER_ID?.trim();
  if (!userId) throw new Error("PLUGGY_SYNC_USER_ID is required for pluggy-migration-readiness");

  const [{ closeDb }, { getPluggyMigrationReadiness }] = await Promise.all([
    import("../db/client"),
    import("../lib/pluggy/migration"),
  ]);

  try {
    console.log(JSON.stringify(await getPluggyMigrationReadiness(userId), null, 2));
  } finally {
    await closeDb();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Pluggy migration readiness failed";
  console.error(message);
  process.exitCode = 1;
});
