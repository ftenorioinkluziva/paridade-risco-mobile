import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { assets, transactions } from "@/db/schema";
import { resolveUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

export async function POST() {
  return NextResponse.json({ error: "Manual transaction writes are disabled", code: "MANUAL_TRANSACTIONS_DISABLED", source: "PLUGGY" }, { status: 410 });
}
