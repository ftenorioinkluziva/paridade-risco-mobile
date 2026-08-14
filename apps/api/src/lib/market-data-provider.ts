import { operationFailure } from "@paridade-risco/shared/contracts";

import { parseYahooResponse, readExternalJson } from "@/lib/external-financial-response";
import { toYahooTicker, type MarketDataSource, type StrategicEtfTicker } from "@/lib/market-data";

export type MarketQuote = {
  ticker: StrategicEtfTicker;
  source: MarketDataSource;
  price: number;
  observedAt: Date;
  fetchedAt: Date;
  changePercent: number | null;
};

type BrapiResult = {
  symbol?: unknown;
  data?: Record<string, unknown>;
  regularMarketPrice?: unknown;
  regularMarketTime?: unknown;
  regularMarketChangePercent?: unknown;
};

const BRAPI_API = "https://brapi.dev/api/quote";
const YAHOO_CHART_API = "https://query1.finance.yahoo.com/v8/finance/chart";

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function parseObservedAt(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function providerError(code: string, message: string, retryable = true) {
  return operationFailure(code, "upstream", message, retryable);
}

function parseBrapiQuote(value: unknown, ticker: StrategicEtfTicker, fetchedAt: Date): MarketQuote {
  const payload = value as { results?: unknown };
  const first = Array.isArray(payload?.results) ? payload.results[0] as BrapiResult | undefined : undefined;
  const data = first?.data && typeof first.data === "object" ? first.data : first;
  const price = finiteNumber(data?.regularMarketPrice);
  const observedAt = parseObservedAt(data?.regularMarketTime);
  if (price === null || price <= 0) throw providerError("UPSTREAM_SCHEMA_INVALID", "Brapi quote has no valid price", false);
  if (!observedAt) throw providerError("UPSTREAM_SCHEMA_INVALID", "Brapi quote has no observable timestamp", false);
  return {
    ticker,
    source: "BRAPI",
    price,
    observedAt,
    fetchedAt,
    changePercent: finiteNumber(data?.regularMarketChangePercent),
  };
}

async function fetchBrapiQuote(ticker: StrategicEtfTicker, fetchedAt: Date): Promise<MarketQuote> {
  const token = process.env.BRAPI_API_TOKEN?.trim();
  if (!token) throw providerError("BRAPI_TOKEN_MISSING", "Brapi token is not configured", false);
  const response = await fetch(`${BRAPI_API}/${encodeURIComponent(ticker)}`, {
    signal: AbortSignal.timeout(10_000),
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) throw providerError("UPSTREAM_HTTP_ERROR", `Brapi returned HTTP ${response.status}`, response.status === 429 || response.status >= 500);
  return parseBrapiQuote(await readExternalJson(response, "Brapi"), ticker, fetchedAt);
}

async function fetchYahooQuote(ticker: StrategicEtfTicker, fetchedAt: Date): Promise<MarketQuote> {
  const response = await fetch(`${YAHOO_CHART_API}/${encodeURIComponent(toYahooTicker(ticker))}?interval=5m&range=1d`, {
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: "application/json", "User-Agent": "paridade-risco/market-data" },
  });
  if (!response.ok) throw providerError("UPSTREAM_HTTP_ERROR", `Yahoo Finance returned HTTP ${response.status}`, response.status === 429 || response.status >= 500);
  const payload = parseYahooResponse(await readExternalJson(response, "Yahoo Finance"));
  if (payload.chart.error) throw providerError("UPSTREAM_PROVIDER_ERROR", "Yahoo Finance returned a provider error", false);
  const result = payload.chart.result?.[0];
  if (!result) throw providerError("UPSTREAM_SCHEMA_INVALID", "Yahoo Finance returned no chart result", false);
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators.quote[0]?.close ?? [];
  for (let index = timestamps.length - 1; index >= 0; index -= 1) {
    const price = finiteNumber(closes[index]);
    if (price !== null && price > 0) {
      return {
        ticker,
        source: "YAHOO_FINANCE",
        price,
        observedAt: new Date(timestamps[index] * 1000),
        fetchedAt,
        changePercent: null,
      };
    }
  }
  throw providerError("UPSTREAM_SCHEMA_INVALID", "Yahoo Finance returned no valid close", false);
}

export async function fetchMarketQuote(ticker: StrategicEtfTicker, fetchedAt = new Date()): Promise<MarketQuote> {
  try {
    return await fetchBrapiQuote(ticker, fetchedAt);
  } catch (brapiError) {
    try {
      return await fetchYahooQuote(ticker, fetchedAt);
    } catch (yahooError) {
      const brapiCode = (brapiError as { operationError?: { code?: string } }).operationError?.code ?? "BRAPI_FAILED";
      const yahooCode = (yahooError as { operationError?: { code?: string } }).operationError?.code ?? "YAHOO_FAILED";
      throw providerError("MARKET_DATA_UNAVAILABLE", `Brapi ${brapiCode}; Yahoo ${yahooCode}`, true);
    }
  }
}
