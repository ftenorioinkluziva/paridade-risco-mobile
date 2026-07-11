import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

import { createTransactionSchema } from "@paridade-risco/shared";

import { db } from "@/db/client";
import { assets, transactions } from "@/db/schema";
import { resolveUserId } from "@/lib/session";
import { executeIdempotentWrite } from "@/lib/idempotency";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json([]);
  }

  const url = new URL(request.url);
  const typeFilter = url.searchParams.get("type");
  const assetTickerFilter = url.searchParams.get("assetTicker")?.toUpperCase();
  const fromFilter = url.searchParams.get("from");
  const toFilter = url.searchParams.get("to");
  const requestedLimit = url.searchParams.get("limit");
  const limit = requestedLimit === null ? undefined : Number(requestedLimit);

  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
    return NextResponse.json({
      success: false,
      error: { code: "INVALID_INPUT", category: "validation", message: "limit must be an integer between 1 and 100", retryable: false, invalidFields: ["limit"] },
    }, { status: 400 });
  }

  const fromDate = fromFilter ? new Date(fromFilter) : null;
  const toDate = toFilter ? new Date(toFilter) : null;

  const whereConditions = [eq(transactions.userId, userId)];

  if (typeFilter === "COMPRA" || typeFilter === "VENDA") {
    whereConditions.push(eq(transactions.type, typeFilter));
  }

  if (fromDate && !Number.isNaN(fromDate.getTime())) {
    whereConditions.push(gte(transactions.tradedAt, fromDate));
  }

  if (toDate && !Number.isNaN(toDate.getTime())) {
    whereConditions.push(lte(transactions.tradedAt, toDate));
  }

  if (assetTickerFilter) {
    const matchingAssets = await db.query.assets.findMany({
      where: eq(assets.ticker, assetTickerFilter),
      columns: {
        id: true,
      },
    });

    if (matchingAssets.length === 0) {
      return NextResponse.json([]);
    }

    whereConditions.push(inArray(transactions.assetId, matchingAssets.map((asset) => asset.id)));
  }

  const rows = await db.query.transactions.findMany({
    where: and(...whereConditions),
    with: {
      asset: {
        columns: {
          ticker: true,
          name: true,
        },
      },
    },
    orderBy: [desc(transactions.tradedAt)],
    limit,
  });

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      assetTicker: row.asset.ticker,
      assetName: row.asset.name,
      type: row.type,
      shares: Number(row.shares),
      pricePerShare: Number(row.pricePerShare),
      amount: Number(row.shares) * Number(row.pricePerShare),
      tradedAt: new Date(row.tradedAt).toISOString(),
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

  const normalizedTicker = parsed.data.assetTicker.trim().toUpperCase();

  const asset = await db.query.assets.findFirst({
    where: eq(assets.ticker, normalizedTicker),
    columns: {
      id: true,
      ticker: true,
      name: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return executeIdempotentWrite({
    request, userId, operation: "transactions.create", payload: parsed.data,
    write: async (tx) => {
      const [transaction] = await tx.insert(transactions).values({
        userId, assetId: asset.id, type: parsed.data.type,
        shares: parsed.data.shares.toString(), pricePerShare: parsed.data.pricePerShare.toString(),
        tradedAt: new Date(parsed.data.tradedAt),
      }).returning({
        id: transactions.id, type: transactions.type, shares: transactions.shares,
        pricePerShare: transactions.pricePerShare, tradedAt: transactions.tradedAt,
      });
      return { body: {
        id: transaction.id, assetTicker: asset.ticker, assetName: asset.name, type: transaction.type,
        amount: Number(transaction.shares) * Number(transaction.pricePerShare),
        tradedAt: new Date(transaction.tradedAt).toISOString(),
        dateLabel: new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
        }).format(new Date(transaction.tradedAt)),
      }, status: 200 };
    },
  });
}
