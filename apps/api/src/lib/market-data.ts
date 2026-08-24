export const STRATEGIC_ETF_TICKERS = [
  "B5P211",
  "BOVA11",
  "DOLA11",
  "FIXA11",
  "IB5M11",
  "IMAB11",
  "IRFM11",
  "LFTS11",
  "XFIX11",
] as const;

export const STRATEGIC_EQUITY_ETF_TICKERS = ["BOVA11"] as const;
export const STRATEGIC_FIXED_INCOME_ETF_TICKERS = STRATEGIC_ETF_TICKERS.filter(
  (ticker) => !STRATEGIC_EQUITY_ETF_TICKERS.includes(ticker as (typeof STRATEGIC_EQUITY_ETF_TICKERS)[number]),
);

export type StrategicEtfTicker = (typeof STRATEGIC_ETF_TICKERS)[number];
export type MarketDataSource = "BRAPI" | "YAHOO_FINANCE";
export type MarketQuoteFreshness = "FRESH" | "STALE" | "UNAVAILABLE";

const STRATEGIC_ETF_SET = new Set<string>(STRATEGIC_ETF_TICKERS);
const STRATEGIC_EQUITY_ETF_SET = new Set<string>(STRATEGIC_EQUITY_ETF_TICKERS);

export function isStrategicEtfTicker(ticker: string): ticker is StrategicEtfTicker {
  return STRATEGIC_ETF_SET.has(ticker.trim().toUpperCase());
}

export function isStrategicEquityEtfTicker(ticker: string): boolean {
  return STRATEGIC_EQUITY_ETF_SET.has(ticker.trim().toUpperCase());
}

export function getStrategicEtfTickersForSchedule(date: Date): readonly StrategicEtfTicker[] {
  if (!isB3TradingSession(date)) return [];
  const { hour, minute } = getSaoPauloParts(date);
  if (hour === 10 && minute < 5) return STRATEGIC_FIXED_INCOME_ETF_TICKERS;
  return STRATEGIC_ETF_TICKERS;
}

export function toYahooTicker(ticker: string): string {
  const normalized = ticker.trim().toUpperCase();
  return normalized.endsWith(".SA") ? normalized : `${normalized}.SA`;
}

export function getSaoPauloParts(date: Date): { weekday: string; hour: number; minute: number; dateKey: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    weekday: values.weekday,
    hour: Number(values.hour),
    minute: Number(values.minute),
    dateKey: `${values.year}-${values.month}-${values.day}`,
  };
}

export function isConfiguredHoliday(date: Date, holidays = process.env.PRICE_SCHEDULER_HOLIDAYS ?? ""): boolean {
  const dateKey = getSaoPauloParts(date).dateKey;
  return holidays.split(",").map((value) => value.trim()).filter(Boolean).includes(dateKey);
}

export function isWeekday(date: Date): boolean {
  const weekday = getSaoPauloParts(date).weekday;
  return weekday !== "Sat" && weekday !== "Sun";
}

export function isB3TradingSession(date: Date): boolean {
  if (!isWeekday(date) || isConfiguredHoliday(date)) return false;
  const { hour, minute } = getSaoPauloParts(date);
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 10 * 60 && totalMinutes <= 16 * 60 + 55;
}

export function isB3FinalCaptureWindow(date: Date): boolean {
  if (!isWeekday(date) || isConfiguredHoliday(date)) return false;
  const { hour, minute } = getSaoPauloParts(date);
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 17 * 60 + 25 && totalMinutes <= 17 * 60 + 35;
}

export function classifyMarketQuoteFreshness(observedAt: Date | null, now = new Date()): MarketQuoteFreshness {
  if (!observedAt || Number.isNaN(observedAt.getTime())) return "UNAVAILABLE";
  const ageMinutes = Math.max(0, (now.getTime() - observedAt.getTime()) / 60_000);
  if (ageMinutes <= 45) return "FRESH";
  if (!isB3TradingSession(now) && ageMinutes <= 24 * 60) return "FRESH";
  return "STALE";
}

export function monthlyCallEstimate({
  tickers = STRATEGIC_ETF_TICKERS.length,
  tradingDays = 22,
  intervalMinutes = 7,
  includeFinalCapture = true,
}: { tickers?: number; tradingDays?: number; intervalMinutes?: number; includeFinalCapture?: boolean } = {}): number {
  if (!Number.isInteger(intervalMinutes) || intervalMinutes <= 0) {
    throw new Error("intervalMinutes must be a positive integer");
  }

  // Mirrors the cron window `*/N 10-16` and the one final capture at 17:30.
  let sessionCycles = 0;
  for (let hour = 10; hour <= 16; hour += 1) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      if (hour * 60 + minute <= 16 * 60 + 55) sessionCycles += 1;
    }
  }
  const cyclesPerDay = sessionCycles + (includeFinalCapture ? 1 : 0);
  return tickers * cyclesPerDay * tradingDays;
}
