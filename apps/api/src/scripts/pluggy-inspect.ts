import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../../../../.env") });

async function main() {
  const userId = process.env.PLUGGY_SYNC_USER_ID?.trim();
  if (!userId) throw new Error("PLUGGY_SYNC_USER_ID is required for pluggy-inspect");

  const [{ closeDb }, { getPluggyProjection }] = await Promise.all([
    import("../db/client"),
    import("../lib/pluggy/projection"),
  ]);

  try {
    const projection = await getPluggyProjection(userId);
    console.log(JSON.stringify({
      generatedAt: projection.generatedAt,
      freshness: projection.freshness,
      connections: projection.connections,
      accounts: projection.accounts.map((account) => ({
        itemId: account.itemId,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        balance: account.balance,
        availableBalance: account.availableBalance,
        creditLimit: account.creditLimit,
        availableCreditLimit: account.availableCreditLimit,
        isCreditCard: account.isCreditCard,
      })),
      investments: projection.investments.map((investment) => ({
        itemId: investment.itemId,
        sourceInvestmentId: investment.sourceInvestmentId,
        code: investment.code,
        name: investment.name,
        type: investment.type,
        subtype: investment.subtype,
        currentValue: investment.currentValue,
        riskBucket: investment.classification.riskBucket,
        mappingStatus: investment.classification.mappingStatus,
        mappingCandidate: investment.mappingCandidate?.ticker ?? null,
        costBasisAvailable: investment.costBasisAvailable,
      })),
      totals: projection.totals,
    }, null, 2));
  } finally {
    await closeDb();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Pluggy inspection failed";
  console.error(message);
  process.exitCode = 1;
});
