import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { assets, liveQuotes, users } from "@/db/schema";
import { verifyPricesUpdateAuthorization } from "@/lib/admin-prices-auth";
import { resolveUserId } from "@/lib/session";

const QUOTE_SOURCES = ["BTG_TRADE_DESK"] as const;
type QuoteSource = typeof QUOTE_SOURCES[number];

const quoteFieldsSchema = z.object({
  "QUOTE.DESCRIPTION": z.string().trim().nullable().optional(),
  "QUOTE.ASSET": z.string().trim().nullable().optional(),
  "QUOTE.SECURITY_TYPE": z.string().trim().nullable().optional(),
  "QUOTE.BID_PRICE": z.string().trim().nullable().optional(),
  "QUOTE.ASK_PRICE": z.string().trim().nullable().optional(),
  "QUOTE.CHGPERCENT": z.string().trim().nullable().optional(),
  "QUOTE.LAST_TRADE_PRICE": z.string().trim().nullable().optional(),
  "QUOTE.LAST_TRADE_QUANTITY": z.string().trim().nullable().optional(),
  "QUOTE.BID_QUANTITY": z.string().trim().nullable().optional(),
  "QUOTE.ASK_QUANTITY": z.string().trim().nullable().optional(),
  "QUOTE.CLOSE": z.string().trim().nullable().optional(),
  "QUOTE.PREV_CLOSE": z.string().trim().nullable().optional(),
  "QUOTE.OPEN": z.string().trim().nullable().optional(),
  "QUOTE.ADJUST": z.string().trim().nullable().optional(),
  "QUOTE.HIGH": z.string().trim().nullable().optional(),
  "QUOTE.LOW": z.string().trim().nullable().optional(),
  "QUOTE.CHANGE": z.string().trim().nullable().optional(),
  "QUOTE.CHANGE_PERCENT": z.string().trim().nullable().optional(),
  "QUOTE.NUM_TRADES": z.string().trim().nullable().optional(),
  "QUOTE.QUANTITY": z.string().trim().nullable().optional(),
}).strict();

const quotePayloadSchema = z.object({
  source: z.enum(QUOTE_SOURCES),
  asset: z.string().trim().min(1),
  topic: z.string().trim().min(1),
  receivedAt: z.string().datetime().optional(),
  fields: quoteFieldsSchema,
}).strict();

function parseDecimal(value: string | null | undefined) {
  if (!value || value === "-") return null;
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string | null | undefined) {
  const parsed = parseDecimal(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value) => value !== null && value !== undefined && value.trim() !== "")?.trim() ?? null;
}

function mapBtgSecurityType(value: string | null | undefined): "ETF" | "RENDA_FIXA" | "CRYPTO" | "COMMODITY" | "CAIXA" | "OUTRO" {
  const normalized = value?.toUpperCase() ?? "";
  if (normalized.includes("ETF")) return "ETF";
  if (normalized.includes("FIXA") || normalized.includes("BOND") || normalized.includes("TESOURO")) return "RENDA_FIXA";
  if (normalized.includes("CRYPTO") || normalized.includes("CRIPTO")) return "CRYPTO";
  if (normalized.includes("COMMODITY") || normalized.includes("OURO")) return "COMMODITY";
  if (normalized.includes("CAIXA") || normalized.includes("CASH")) return "CAIXA";
  return "OUTRO";
}

async function authorize(request: NextRequest) {
  return verifyPricesUpdateAuthorization(request, {
    resolveIdentity: resolveUserId,
    findUser: (userId) => db.query.users.findFirst({ where: eq(users.id, userId), columns: { role: true } }),
    cronSecret: process.env.PROFIT_RTD_INGEST_SECRET,
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

    const parsed = quotePayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid BTG RTD quote payload", issues: parsed.error.flatten() }, { status: 400 });
    }

    const payload = parsed.data;
    const asset = await db.query.assets.findFirst({
      where: and(eq(assets.ticker, payload.asset.toUpperCase()), eq(assets.isActive, true)),
      columns: { id: true, ticker: true, name: true, type: true },
    });
    if (!asset) return NextResponse.json({ error: `Active asset not found: ${payload.asset}` }, { status: 404 });

    const btgDescription = firstText(payload.fields["QUOTE.DESCRIPTION"], payload.fields["QUOTE.ASSET"]);
    const btgType = mapBtgSecurityType(payload.fields["QUOTE.SECURITY_TYPE"]);
    const assetUpdate: { name?: string; type?: typeof asset.type } = {};
    if (btgDescription && asset.name === asset.ticker) assetUpdate.name = btgDescription;
    if (asset.type === "OUTRO" && btgType !== "OUTRO") assetUpdate.type = btgType;
    if (Object.keys(assetUpdate).length > 0) {
      await db.update(assets).set(assetUpdate).where(eq(assets.id, asset.id));
    }

    const receivedAt = payload.receivedAt ? new Date(payload.receivedAt) : new Date();
    const source: QuoteSource = payload.source;
    const values = {
      assetId: asset.id,
      source,
      topic: payload.topic,
      quoteDate: null,
      quoteTime: null,
      last: parseDecimal(payload.fields["QUOTE.LAST_TRADE_PRICE"])?.toString() ?? null,
      open: parseDecimal(payload.fields["QUOTE.OPEN"])?.toString() ?? null,
      high: parseDecimal(payload.fields["QUOTE.HIGH"])?.toString() ?? null,
      low: parseDecimal(payload.fields["QUOTE.LOW"])?.toString() ?? null,
      strike: null,
      trades: parseInteger(payload.fields["QUOTE.NUM_TRADES"]),
      expiration: null,
      rawData: payload.fields,
      receivedAt,
    };

    const [saved] = await db.insert(liveQuotes).values(values).onConflictDoUpdate({
      target: [liveQuotes.assetId, liveQuotes.source],
      set: {
        topic: values.topic,
        quoteDate: values.quoteDate,
        quoteTime: values.quoteTime,
        last: values.last,
        open: values.open,
        high: values.high,
        low: values.low,
        strike: values.strike,
        trades: values.trades,
        expiration: values.expiration,
        rawData: values.rawData,
        receivedAt: values.receivedAt,
        updatedAt: new Date(),
      },
    }).returning({ id: liveQuotes.id, assetId: liveQuotes.assetId, source: liveQuotes.source, last: liveQuotes.last, receivedAt: liveQuotes.receivedAt });

    return NextResponse.json({ ok: true, quote: { ...saved, asset: asset.ticker } });
  } catch (error) {
    console.error("POST /api/integrations/profit/quotes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorize(request);
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 });

    const rows = await db.select({
      asset: assets.ticker,
      name: assets.name,
      source: liveQuotes.source,
      topic: liveQuotes.topic,
      quoteDate: liveQuotes.quoteDate,
      quoteTime: liveQuotes.quoteTime,
      last: liveQuotes.last,
      open: liveQuotes.open,
      high: liveQuotes.high,
      low: liveQuotes.low,
      strike: liveQuotes.strike,
      trades: liveQuotes.trades,
      expiration: liveQuotes.expiration,
      receivedAt: liveQuotes.receivedAt,
      updatedAt: liveQuotes.updatedAt,
    }).from(liveQuotes).innerJoin(assets, and(eq(assets.id, liveQuotes.assetId), eq(liveQuotes.source, "BTG_TRADE_DESK"))).orderBy(asc(assets.ticker));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/integrations/profit/quotes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
