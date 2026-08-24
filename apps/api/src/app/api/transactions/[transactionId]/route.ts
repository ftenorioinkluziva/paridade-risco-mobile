import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { transactions } from "@/db/schema";
import { resolveUserId } from "@/lib/session";

async function findOwnedTransaction(userId: string, transactionId: string) {
  return db.query.transactions.findFirst({
    where: and(eq(transactions.id, transactionId), eq(transactions.userId, userId)),
    with: {
      asset: {
        columns: { name: true, ticker: true },
      },
    },
  });
}

function transactionResponse(transaction: NonNullable<Awaited<ReturnType<typeof findOwnedTransaction>>>) {
  return {
    id: transaction.id,
    assetTicker: transaction.asset.ticker,
    assetName: transaction.asset.name,
    type: transaction.type,
    shares: Number(transaction.shares),
    pricePerShare: Number(transaction.pricePerShare),
    amount: Number(transaction.shares) * Number(transaction.pricePerShare),
    tradedAt: transaction.tradedAt.toISOString(),
  };
}

export async function GET(request: Request, context: { params: Promise<{ transactionId: string }> }) {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transactionId } = await context.params;
  const transaction = await findOwnedTransaction(userId, transactionId);
  if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  return NextResponse.json(transactionResponse(transaction));
}

export async function PUT() {
  return NextResponse.json({ error: "Manual transaction writes are disabled", code: "MANUAL_TRANSACTIONS_DISABLED", source: "PLUGGY" }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Manual transaction writes are disabled", code: "MANUAL_TRANSACTIONS_DISABLED", source: "PLUGGY" }, { status: 410 });
}
