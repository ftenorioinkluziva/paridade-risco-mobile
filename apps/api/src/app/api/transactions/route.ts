import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { createTransactionSchema } from "@paridade-risco/shared";

import { db } from "@/db/client";
import { assets, transactions } from "@/db/schema";
import { resolveUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json([]);
  }

  const rows = await db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    with: {
      asset: {
        columns: {
          ticker: true,
          name: true,
        },
      },
    },
    orderBy: [desc(transactions.tradedAt)],
  });

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      assetTicker: row.asset.ticker,
      assetName: row.asset.name,
      type: row.type,
      amount: Number(row.shares) * Number(row.pricePerShare),
      dateLabel: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(row.tradedAt)),
    })),
  );
}

export async function POST(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createTransactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const asset = await db.query.assets.findFirst({
    where: eq(assets.ticker, parsed.data.assetTicker),
    columns: {
      id: true,
      ticker: true,
      name: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const [transaction] = await db
    .insert(transactions)
    .values({
      userId,
      assetId: asset.id,
      type: parsed.data.type,
      shares: parsed.data.shares.toString(),
      pricePerShare: parsed.data.pricePerShare.toString(),
      tradedAt: new Date(parsed.data.tradedAt),
    })
    .returning({
      id: transactions.id,
      type: transactions.type,
      shares: transactions.shares,
      pricePerShare: transactions.pricePerShare,
      tradedAt: transactions.tradedAt,
    });

  return NextResponse.json({
    id: transaction.id,
    assetTicker: asset.ticker,
    assetName: asset.name,
    type: transaction.type,
    amount: Number(transaction.shares) * Number(transaction.pricePerShare),
    dateLabel: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(transaction.tradedAt)),
  });
}
