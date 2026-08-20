import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, closeDb } from "./client";

async function runMigrations() {
  console.log("Running migrations from ./drizzle...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully!");
  await closeDb();
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
