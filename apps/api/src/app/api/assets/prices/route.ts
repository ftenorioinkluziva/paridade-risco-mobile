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

    const hasPeriod = from || to;

    if (hasPeriod) {
      const rows = await db.execute<PriceRow>(
        sql`
          SELECT a.ticker, a.name, a.calculation_type, hp.price, hp.price_date
          FROM assets a
          JOIN historical_prices hp ON hp.asset_id = a.id
          WHERE a.is_active = true
          ${ticker ? sql`AND a.ticker = ${ticker}` : sql``}
          ${from ? sql`AND hp.price_date >= ${new Date(from)}` : sql``}
          ${to ? sql`AND hp.price_date <= ${new Date(to)}` : sql``}
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
        WHERE a.is_active = true
        ${ticker ? sql`AND a.ticker = ${ticker}` : sql``}
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
  } catch (error) {
    console.error("GET /api/assets/prices error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
