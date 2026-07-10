import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db/client";

type PriceRow = {
  ticker: string;
  name: string;
  calculation_type: string;
  price: string;
  price_date: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get("ticker")?.trim().toUpperCase() || null;
    const from = searchParams.get("from") || null;
    const to = searchParams.get("to") || null;

    if (from && isNaN(new Date(from).getTime())) {
      return NextResponse.json({ error: "param 'from' com formato de data invalido" }, { status: 400 });
    }
    if (to && isNaN(new Date(to).getTime())) {
      return NextResponse.json({ error: "param 'to' com formato de data invalido" }, { status: 400 });
    }

    if (from || to) {
      const rows = await db.execute<PriceRow>(
        sql`WITH monitorable_assets AS (
  SELECT a.*
  FROM assets a
  WHERE a.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM assets canonical
      WHERE canonical.is_active = true
        AND canonical.source_ticker = a.ticker
    )
)
SELECT DISTINCT ON (a.ticker, hp.price_date)
  a.ticker, a.name, a.calculation_type, hp.price, hp.price_date
FROM monitorable_assets a
JOIN historical_prices hp
  ON hp.asset_id = a.id
  OR hp.asset_id IN (
    SELECT source_asset.id
    FROM assets source_asset
    WHERE source_asset.ticker = a.source_ticker
  )
WHERE true
${ticker ? sql`AND (a.ticker = ${ticker} OR a.source_ticker = ${ticker})` : sql``}
${from ? sql`AND hp.price_date >= ${from}::date` : sql``}
${to ? sql`AND hp.price_date <= ${to}::date` : sql``}
ORDER BY a.ticker ASC, hp.price_date DESC, CASE WHEN hp.asset_id = a.id THEN 0 ELSE 1 END ASC`,
      );
      return NextResponse.json(rows.map((r) => ({
        ticker: r.ticker,
        name: r.name,
        calculationType: r.calculation_type,
        price: r.price ? parseFloat(r.price) : null,
        priceDate: r.price_date ?? null,
      })));
    }

    const rows = await db.execute<PriceRow>(
      sql`WITH monitorable_assets AS (
  SELECT a.*
  FROM assets a
  WHERE a.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM assets canonical
      WHERE canonical.is_active = true
        AND canonical.source_ticker = a.ticker
    )
)
SELECT a.ticker, a.name, a.calculation_type, hp.price, hp.price_date
FROM monitorable_assets a
LEFT JOIN LATERAL (
  SELECT price, price_date
  FROM historical_prices hp
  WHERE hp.asset_id = a.id
    OR hp.asset_id IN (
      SELECT source_asset.id
      FROM assets source_asset
      WHERE source_asset.ticker = a.source_ticker
    )
  ORDER BY price_date DESC, CASE WHEN hp.asset_id = a.id THEN 0 ELSE 1 END ASC
  LIMIT 1
) hp ON true
WHERE true
${ticker ? sql`AND (a.ticker = ${ticker} OR a.source_ticker = ${ticker})` : sql``}
ORDER BY a.ticker ASC`,
    );
    return NextResponse.json(rows.map((r) => ({
      ticker: r.ticker,
      name: r.name,
      calculationType: r.calculation_type,
      price: r.price ? parseFloat(r.price) : null,
      priceDate: r.price_date ?? null,
    })));
  } catch (error) {
    console.error("GET /api/assets/prices error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
