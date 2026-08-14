import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../../../../.env") });

async function main() {
  const userId = process.env.PLUGGY_SYNC_USER_ID?.trim();
  if (!userId) throw new Error("PLUGGY_SYNC_USER_ID is required for pluggy-dual-read");

  const [{ closeDb }, { getPortfolioDualRead }] = await Promise.all([
    import("../db/client"),
    import("../lib/portfolio-dual-read"),
  ]);

  try {
    const result = await getPortfolioDualRead(userId);
    console.log(JSON.stringify({
      generatedAt: result.generatedAt,
      comparison: result.comparison,
      manual: {
        source: result.manual.source,
        totalValue: result.manual.totalValue,
        investedValue: result.manual.investedValue,
        cashBalance: result.manual.cashBalance,
        positionCount: result.manual.positions.length,
        warnings: result.manual.warnings,
      },
      pluggy: {
        source: result.pluggy.source,
        observedAt: result.pluggy.observedAt,
        totalValue: result.pluggy.totalValue,
        investedValue: result.pluggy.investedValue,
        cashBalance: result.pluggy.cashBalance,
        positionCount: result.pluggy.positions.length,
        warnings: result.pluggy.warnings,
      },
    }, null, 2));
  } finally {
    await closeDb();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Pluggy dual-read failed";
  console.error(message);
  process.exitCode = 1;
});
