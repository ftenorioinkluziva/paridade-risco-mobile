import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { pluggyLoans } from "@/db/schema";
import { toNumber } from "@/lib/number";
import { getPluggyFinancialOverview, type PluggyFinancialOverview } from "./financial-overview";
import { buildFinancialHealthOverview } from "./financial-health-rules";

export async function getPluggyFinancialHealth(userId: string, input: { periodDays?: number; now?: Date } = {}) {
  const [financial, loans] = await Promise.all([
    getPluggyFinancialOverview(userId, input),
    db.query.pluggyLoans.findMany({
      where: and(eq(pluggyLoans.userId, userId)),
      columns: {
        id: true,
        name: true,
        status: true,
        originalAmount: true,
        outstandingBalance: true,
        installmentAmount: true,
        interestRate: true,
        nextDueDate: true,
        maturityDate: true,
        observedAt: true,
      },
    }),
  ]);

  return buildFinancialHealthOverview({
    financial,
    loans: loans.map((loan) => ({
      ...loan,
      originalAmount: loan.originalAmount === null ? null : toNumber(loan.originalAmount),
      outstandingBalance: loan.outstandingBalance === null ? null : toNumber(loan.outstandingBalance),
      installmentAmount: loan.installmentAmount === null ? null : toNumber(loan.installmentAmount),
      interestRate: loan.interestRate === null ? null : toNumber(loan.interestRate),
    })),
    now: input.now,
  });
}

export { buildFinancialHealthOverview } from "./financial-health-rules";
export type { PluggyFinancialOverview };
