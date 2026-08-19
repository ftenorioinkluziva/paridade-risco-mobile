import { PluggyApiError, PluggyClient, type PluggyResource } from "./client";
import { getUserPluggyConfig, readPluggyConfig, type PluggyConfig } from "./config";
import {
  createSyncRun,
  finishSyncRun,
  type PluggyDatabase,
  updateConnectionSync,
  upsertAccount,
  upsertConnection,
  upsertInvestment,
  upsertLoan,
  upsertTransaction,
  findRunningSync,
} from "./repository";

export interface PluggySyncSummary {
  connectionId: string;
  syncRunId: string;
  accounts: number;
  investments: number;
  loans: number;
  transactions: number;
  loansUnavailable: boolean;
}

export class PluggySyncInProgressError extends Error {
  readonly code = "PLUGGY_SYNC_IN_PROGRESS";

  constructor(readonly syncRunId: string) {
    super("Já existe uma sincronização Pluggy em andamento");
    this.name = "PluggySyncInProgressError";
  }
}

const safeResourceId = (resource: PluggyResource): string | null => typeof resource.id === "string" ? resource.id : null;

async function syncTransactions(input: {
  client: PluggyClient;
  database: PluggyDatabase;
  connectionId: string;
  userId: string;
  accountId: string;
  sourceAccountId: string;
  observedAt: Date;
}) {
  let after: string | undefined;
  let count = 0;

  do {
    const page = await input.client.listTransactions({ accountId: input.sourceAccountId, ...(after ? { after } : {}) });
    for (const transaction of page.results) {
      await upsertTransaction(input.database, {
        connectionId: input.connectionId,
        accountId: input.accountId,
        userId: input.userId,
        sourceAccountId: input.sourceAccountId,
        source: transaction,
        observedAt: input.observedAt,
      });
      count += 1;
    }
    after = page.next ?? undefined;
  } while (after);

  return count;
}

export async function syncPluggyItem(input: {
  client: PluggyClient;
  database: PluggyDatabase;
  userId: string;
  itemId: string;
  config?: PluggyConfig;
}): Promise<PluggySyncSummary> {
  const config = input.config ?? readPluggyConfig();
  const runningSync = await findRunningSync(input.database, input.userId);
  if (runningSync) throw new PluggySyncInProgressError(runningSync.id);
  const startedAt = new Date();
  const item = await input.client.getItem(input.itemId);
  const connectionId = await upsertConnection(input.database, {
    userId: input.userId,
    itemId: input.itemId,
    environment: config.environment,
    item,
  });
  let syncRunId: string;
  try {
    syncRunId = await createSyncRun(input.database, { connectionId, userId: input.userId, startedAt });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const concurrentRun = await findRunningSync(input.database, input.userId);
      if (concurrentRun) throw new PluggySyncInProgressError(concurrentRun.id);
    }
    throw error;
  }
  const summary: PluggySyncSummary = {
    connectionId,
    syncRunId,
    accounts: 0,
    investments: 0,
    loans: 0,
    transactions: 0,
    loansUnavailable: false,
  };

  try {
    const observedAt = new Date();
    const accountsPage = await input.client.listAccounts(input.itemId);
    const accountIds = new Map<string, string>();
    for (const account of accountsPage.results) {
      const sourceAccountId = safeResourceId(account);
      if (!sourceAccountId) continue;
      const localAccountId = await upsertAccount(input.database, { connectionId, userId: input.userId, source: account, observedAt });
      accountIds.set(sourceAccountId, localAccountId);
      summary.accounts += 1;
    }

    const investmentsPage = await input.client.listInvestments(input.itemId);
    for (const investment of investmentsPage.results) {
      if (!safeResourceId(investment)) continue;
      await upsertInvestment(input.database, { connectionId, userId: input.userId, source: investment, observedAt });
      summary.investments += 1;
    }

    try {
      const loansPage = await input.client.listLoans(input.itemId);
      for (const loan of loansPage.results) {
        if (!safeResourceId(loan)) continue;
        await upsertLoan(input.database, { connectionId, userId: input.userId, source: loan, observedAt });
        summary.loans += 1;
      }
    } catch (error) {
      if (error instanceof PluggyApiError && (error.status === 403 || error.status === 404)) {
        summary.loansUnavailable = true;
      } else {
        throw error;
      }
    }

    for (const [sourceAccountId, localAccountId] of accountIds) {
      summary.transactions += await syncTransactions({
        client: input.client,
        database: input.database,
        connectionId,
        userId: input.userId,
        accountId: localAccountId,
        sourceAccountId,
        observedAt,
      });
    }

    const finishedAt = new Date();
    await finishSyncRun(input.database, { id: syncRunId, status: "SUCCEEDED", finishedAt, counts: summary });
    await updateConnectionSync(input.database, { id: connectionId, status: "SUCCEEDED", syncedAt: finishedAt });
    return summary;
  } catch (error) {
    const finishedAt = new Date();
    const message = error instanceof Error ? error.message : "Pluggy sync failed";
    await finishSyncRun(input.database, { id: syncRunId, status: "FAILED", finishedAt, counts: summary, error: message });
    await updateConnectionSync(input.database, { id: connectionId, status: "FAILED", syncedAt: finishedAt, error: message });
    throw error;
  }
}

export async function syncConfiguredPluggyItem(input: {
  client?: PluggyClient;
  database: PluggyDatabase;
  userId: string;
  config?: PluggyConfig;
}) {
  const config = input.config ?? (await getUserPluggyConfig(input.userId, input.database));
  const client = input.client ?? new PluggyClient(config);

  if (!config.sandboxItemId) {
    throw new Error("Item ID da Pluggy não está configurado");
  }

  return syncPluggyItem({
    client,
    database: input.database,
    userId: input.userId,
    itemId: config.sandboxItemId,
    config,
  });
}
