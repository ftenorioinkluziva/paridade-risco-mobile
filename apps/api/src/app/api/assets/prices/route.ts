import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db/client";

type PriceRow = {
  ticker: string;
  name: string;
  calculation_type: string;
  price: string | null;
  price_date: string | null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.trim().toUpperCase() || null;
  const from = searchParams.get("from") || null;
  const to = searchParams.get("to") || null;

  if (from || to) {
    const conditions: ReturnType<typeof sql>[] = [sql`a.is_active = true`];

    if (ticker) {
      conditions.push(sql`a.ticker = ${ticker}`);
    }
    if (from) {
      conditions.push(sql`hp.price_date >= ${new Date(from)}`);
    }
    if (to) {
      conditions.push(sql`hp.price_date <= ${new Date(to)}`);
    }

    const rows = await db.execute<PriceRow>(
      sql`
        SELECT a.ticker, a.name, a.calculation_type, hp.price, hp.price_date
        FROM assets a
        JOIN historical_prices hp ON hp.asset_id = a.id
        WHERE ${sql.join(conditions, sql` AND `)}
        ORDER BY a.ticker ASC, hp.price_date DESC
      `,
    );

    return NextResponse.json(rows.map((r) => ({
      ticker: r.ticker,
      name: r.name,
      calculationType: r.calculation_type,
      price: r.price ? parseFloat(r.price) : null,
      priceDate: r.price_date ?? null,
    })));
  }

  const conditions: ReturnType<typeof sql>[] = [sql`a.is_active = true`];

  if (ticker) {
    conditions.push(sql`a.ticker = ${ticker}`);
  }

  const rows = await db.execute<PriceRow>(
    sql`
      SELECT a.ticker, a.name, a.calculation_type, hp.price, hp.price_date
      FROM assets a
      LEFT JOIN LATERAL (
        SELECT price, price_date
        FROM historical_prices
        WHERE asset_id = a.id
        ORDER BY price_date DESC
        LIMIT 1
      ) hp ON true
      WHERE ${sql.join(conditions, sql` AND `)}
      ORDER BY a.ticker ASC
    `,
  );

  return NextResponse.json(rows.map((r) => ({
    ticker: r.ticker,
    name: r.name,
    calculationType: r.calculation_type,
    price: r.price ? parseFloat(r.price) : null,
    priceDate: r.price_date ?? null,
  })));
}
