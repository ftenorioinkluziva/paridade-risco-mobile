import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";

type PriceRow = {
  ticker: string;
  name: string;
  price: string | null;
  price_date: string | null;
};

export async function GET() {
  const rows = await db.execute<PriceRow>(
    sql`
      SELECT
        a.ticker,
        a.name,
        hp.price,
        hp.price_date
      FROM assets a
      LEFT JOIN LATERAL (
        SELECT price, price_date
        FROM historical_prices
        WHERE asset_id = a.id
        ORDER BY price_date DESC
        LIMIT 1
      ) hp ON true
      WHERE a.is_active = true
      ORDER BY a.ticker ASC
    `,
  );

  return NextResponse.json(rows.map((r) => ({
    ticker: r.ticker,
    name: r.name,
    price: r.price ? parseFloat(r.price) : null,
    priceDate: r.price_date ?? null,
  })));
}
