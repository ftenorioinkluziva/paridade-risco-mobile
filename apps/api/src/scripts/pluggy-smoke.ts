import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PluggyClient } from "../lib/pluggy/client";
import { readPluggyConfig } from "../lib/pluggy/config";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDirectory, "../../../../.env") });

const asId = (resource: Record<string, unknown>): string | null => typeof resource.id === "string" ? resource.id : null;

async function main() {
  const config = readPluggyConfig();
  if (config.environment !== "sandbox") {
    throw new Error("pluggy-smoke only runs with PLUGGY_ENVIRONMENT=sandbox");
  }
  if (!config.sandboxItemId) {
    throw new Error("PLUGGY_SANDBOX_ITEM_ID is required for pluggy-smoke");
  }

  const client = new PluggyClient(config);
  const item = await client.getItem(config.sandboxItemId);
  const [accounts, investments, loans] = await Promise.all([
    client.listAccounts(config.sandboxItemId),
    client.listInvestments(config.sandboxItemId),
    client.listLoans(config.sandboxItemId),
  ]);

  let transactionCount = 0;
  for (const account of accounts.results) {
    const accountId = asId(account);
    if (!accountId) continue;
    const transactions = await client.listTransactions({ accountId });
    transactionCount += transactions.results.length;
  }

  console.log(JSON.stringify({
    environment: config.environment,
    itemId: config.sandboxItemId,
    itemStatus: typeof item.status === "string" ? item.status : "unknown",
    accounts: accounts.results.length,
    investments: investments.results.length,
    loans: loans.results.length,
    firstPageTransactions: transactionCount,
  }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Pluggy smoke test failed";
  console.error(message);
  process.exitCode = 1;
});
