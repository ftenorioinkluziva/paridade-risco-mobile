import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { assets } from "@/db/schema";
import { resolveUserId } from "@/lib/session";

const createAssetSchema = z.object({
  ticker: z.string().trim().min(1).max(24).regex(/^[A-Za-z0-9._=-]+$/).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(120).optional(),
  type: z.enum(["ETF", "RENDA_FIXA", "CRYPTO", "COMMODITY", "CAIXA", "OUTRO"]).optional().default("OUTRO"),
  calculationType: z.enum(["PRECO", "PERCENTUAL"]).default("PRECO"),
});

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("source")?.trim().toUpperCase();

  if (source === "BTG_TRADE_DESK") {
    const rows = await db.execute<{ id: string; ticker: string; name: string; type: string }>(
      sql`SELECT a.id, a.ticker, a.name, a.type
FROM assets a
WHERE a.is_active = true
  AND a.calculation_type = 'PRECO'
  AND a.type <> 'CAIXA'
  AND NOT EXISTS (
    SELECT 1
    FROM assets canonical
    WHERE canonical.is_active = true
      AND canonical.source_ticker = a.ticker
  )
ORDER BY a.ticker ASC`,
    );

    return NextResponse.json(rows);
  }

  const rows = await db.execute<{ id: string; ticker: string; name: string }>(
    sql`SELECT a.id, a.ticker, a.name
FROM assets a
WHERE a.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM assets canonical
    WHERE canonical.is_active = true
      AND canonical.source_ticker = a.ticker
  )
ORDER BY a.ticker ASC`,
  );

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 401 });
  }

  const parsed = createAssetSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const assetName = parsed.data.name ?? parsed.data.ticker;

  const existing = await db.query.assets.findFirst({
    where: eq(assets.ticker, parsed.data.ticker),
    columns: { id: true, isActive: true },
  });

  if (existing?.isActive) {
    return NextResponse.json({ error: `Asset ${parsed.data.ticker} already exists` }, { status: 409 });
  }

  if (existing) {
    const [reactivated] = await db.update(assets)
      .set({
        name: assetName,
        type: parsed.data.type,
        calculationType: parsed.data.calculationType,
        isActive: true,
      })
      .where(eq(assets.id, existing.id))
      .returning({ id: assets.id, ticker: assets.ticker, name: assets.name, type: assets.type, calculationType: assets.calculationType });

    return NextResponse.json(reactivated, { status: 200 });
  }

  const [created] = await db.insert(assets).values({
    ticker: parsed.data.ticker,
    name: assetName,
    type: parsed.data.type,
    calculationType: parsed.data.calculationType,
    sourceTicker: null,
    isActive: true,
  }).returning({ id: assets.id, ticker: assets.ticker, name: assets.name, type: assets.type, calculationType: assets.calculationType });

  return NextResponse.json(created, { status: 201 });
}
