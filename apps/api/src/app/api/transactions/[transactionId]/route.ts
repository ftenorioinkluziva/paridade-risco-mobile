import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { assets, transactions } from "@/db/schema";
import { resolveUserId } from "@/lib/session";

const updateTransactionSchema = z.object({
  assetTicker: z.string().trim().min(1).optional(),
  pricePerShare: z.number().nonnegative().optional(),
  shares: z.number().positive().optional(),
  tradedAt: z.string().datetime().optional(),
  type: z.enum(["COMPRA", "VENDA"]).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required",
});

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

export async function PUT(request: Request, context: { params: Promise<{ transactionId: string }> }) {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updateTransactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let assetId: string | undefined;
  if (parsed.data.assetTicker) {
    const asset = await db.query.assets.findFirst({
      where: eq(assets.ticker, parsed.data.assetTicker.toUpperCase()),
      columns: { id: true },
    });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    assetId = asset.id;
  }

  const { transactionId } = await context.params;
  const [updated] = await db.update(transactions).set({
    assetId,
    pricePerShare: parsed.data.pricePerShare?.toString(),
    shares: parsed.data.shares?.toString(),
    tradedAt: parsed.data.tradedAt ? new Date(parsed.data.tradedAt) : undefined,
    type: parsed.data.type,
  }).where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .returning({ id: transactions.id });

  if (!updated) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  const transaction = await findOwnedTransaction(userId, transactionId);
  if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  return NextResponse.json(transactionResponse(transaction));
}

export async function DELETE(request: Request, context: { params: Promise<{ transactionId: string }> }) {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transactionId } = await context.params;
  const [deleted] = await db.delete(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
    .returning({ id: transactions.id });

  if (!deleted) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  return NextResponse.json({ ok: true, id: deleted.id });
}
