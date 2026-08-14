import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db/client";
import { classifyMarketQuoteFreshness, STRATEGIC_ETF_TICKERS } from "@/lib/market-data";

type PriceRow = {
  ticker: string;
  name: string;
  calculation_type: string;
  price: string;
  price_date: string;
};

type LiveQuoteRow = {
  ticker: string;
  name: string;
  calculation_type: string;
  price: string | null;
  bid: string | null;
  ask: string | null;
  change_percent: string | null;
  price_date: string | null;
};

type MarketQuoteRow = {
  ticker: string;
  name: string;
  calculation_type: string;
  source: string | null;
  price: string | null;
  received_at: string | null;
  raw_data: unknown;
};

function observedAtFromRawData(rawData: unknown, fallback: string | null): string | null {
  if (rawData && typeof rawData === "object" && "observedAt" in rawData && typeof rawData.observedAt === "string") {
    return rawData.observedAt;
  }
  return fallback;
}

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

    if (searchParams.get("source")?.trim().toUpperCase() === "MARKET_DATA") {
      const rows = await db.execute<MarketQuoteRow>(
        sql`SELECT a.ticker, a.name, a.calculation_type,
  q.source, q.last AS price, q.received_at, q.raw_data
FROM assets a
LEFT JOIN LATERAL (
  SELECT lq.source, lq.last, lq.received_at, lq.raw_data
  FROM live_quotes lq
  WHERE lq.asset_id = a.id
    AND lq.source IN ('BRAPI', 'YAHOO_FINANCE')
  ORDER BY lq.received_at DESC
  LIMIT 1
) q ON true
WHERE a.is_active = true
  AND a.ticker IN (${sql.join(STRATEGIC_ETF_TICKERS.map((value) => sql`${value}`), sql`, `)})
ORDER BY a.ticker ASC`,
      );

      return NextResponse.json(rows.map((row) => {
        const observedAt = observedAtFromRawData(row.raw_data, row.received_at);
        const observedDate = observedAt ? new Date(observedAt) : null;
        const freshness = classifyMarketQuoteFreshness(observedDate);
        return {
          ticker: row.ticker,
          name: row.name,
          calculationType: row.calculation_type,
          price: row.price === null ? null : parseFloat(row.price),
          bid: null,
          ask: null,
          changePercent: row.raw_data && typeof row.raw_data === "object" && "changePercent" in row.raw_data && typeof row.raw_data.changePercent === "number" ? row.raw_data.changePercent : null,
          source: row.source,
          observedAt,
          fetchedAt: row.received_at,
          freshness,
          priceDate: observedAt,
        };
      }), { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    if (searchParams.get("source")?.trim().toUpperCase() === "BTG_TRADE_DESK") {
      const rows = await db.execute<LiveQuoteRow>(
        sql`WITH monitorable_assets AS (
  SELECT a.*
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
), latest_btg_quotes AS (
  SELECT DISTINCT ON (lq.asset_id)
    lq.asset_id, lq.last, lq.raw_data, lq.received_at
  FROM live_quotes lq
  WHERE lq.source = 'BTG_TRADE_DESK'
  ORDER BY lq.asset_id, lq.received_at DESC
)
SELECT a.ticker, a.name, a.calculation_type, q.last AS price, q.received_at AS price_date
  , q.raw_data->>'QUOTE.BID_PRICE' AS bid
  , q.raw_data->>'QUOTE.ASK_PRICE' AS ask
  , q.raw_data->>'QUOTE.CHANGE_PERCENT' AS change_percent
FROM monitorable_assets a
JOIN latest_btg_quotes q ON q.asset_id = a.id
WHERE true
${ticker ? sql`AND a.ticker = ${ticker}` : sql``}
${from ? sql`AND q.received_at >= ${from}::date` : sql``}
${to ? sql`AND q.received_at < (${to}::date + INTERVAL '1 day')` : sql``}
ORDER BY a.ticker ASC`,
      );

      return NextResponse.json(rows.map((r) => ({
        ticker: r.ticker,
        name: r.name,
        calculationType: r.calculation_type,
        price: r.price === null ? null : parseFloat(r.price),
        bid: r.bid === null ? null : parseFloat(r.bid),
        ask: r.ask === null ? null : parseFloat(r.ask),
        changePercent: r.change_percent === null ? null : parseFloat(r.change_percent),
        priceDate: r.price_date ?? null,
      })), {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      });
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
