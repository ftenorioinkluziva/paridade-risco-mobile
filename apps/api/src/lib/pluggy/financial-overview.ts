import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db/client";
import { pluggyAccounts, pluggySyncRuns, pluggyTransactions } from "@/db/schema";
import { toNumber } from "@/lib/number";
import { buildFinancialOverview } from "./financial-overview-rules";

export type PluggyFinancialOverview = ReturnType<typeof buildFinancialOverview>;

export async function getPluggyFinancialOverview(userId: string, input: { periodDays?: number; now?: Date } = {}) {
  const now = input.now ?? new Date();
  const periodDays = Math.max(1, Math.min(365, Math.floor(input.periodDays ?? 90)));
  const periodFrom = new Date(now);
  periodFrom.setUTCDate(periodFrom.getUTCDate() - (periodDays - 1));
  const previousMonthFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const transactionsFrom = periodFrom < previousMonthFrom ? periodFrom : previousMonthFrom;

  const [accounts, transactions, syncRuns] = await Promise.all([
    db.query.pluggyAccounts.findMany({
      where: eq(pluggyAccounts.userId, userId),
      columns: {
        id: true,
        name: true,
        type: true,
        subtype: true,
        balance: true,
        availableBalance: true,
        creditLimit: true,
        availableCreditLimit: true,
        minimumPayment: true,
        balanceDueDate: true,
        balanceCloseDate: true,
        observedAt: true,
      },
    }),
    db.query.pluggyTransactions.findMany({
      where: and(
        eq(pluggyTransactions.userId, userId),
        gte(pluggyTransactions.transactionDate, transactionsFrom),
        lte(pluggyTransactions.transactionDate, now),
      ),
      columns: {
        accountId: true,
        transactionDate: true,
        amount: true,
        type: true,
        status: true,
        category: true,
        merchantName: true,
      },
    }),
    db.query.pluggySyncRuns.findMany({
      where: eq(pluggySyncRuns.userId, userId),
      columns: { finishedAt: true },
      orderBy: [desc(pluggySyncRuns.finishedAt)],
      limit: 1,
    }),
  ]);

  return buildFinancialOverview({
    accounts: accounts.map((account) => ({
      ...account,
      balance: account.balance === null ? null : toNumber(account.balance),
      availableBalance: account.availableBalance === null ? null : toNumber(account.availableBalance),
      creditLimit: account.creditLimit === null ? null : toNumber(account.creditLimit),
      availableCreditLimit: account.availableCreditLimit === null ? null : toNumber(account.availableCreditLimit),
      minimumPayment: account.minimumPayment === null ? null : toNumber(account.minimumPayment),
    })),
    transactions: transactions.map((transaction) => ({
      ...transaction,
      amount: transaction.amount === null ? null : toNumber(transaction.amount),
    })),
    now,
    periodDays,
    latestSyncAt: syncRuns[0]?.finishedAt ?? null,
  });
}

export { buildFinancialOverview } from "./financial-overview-rules";
