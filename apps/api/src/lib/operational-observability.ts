import { createHash } from "node:crypto";

import { monthlyCallEstimate, STRATEGIC_ETF_TICKERS } from "./market-data";

/**
 * Operational events intentionally use an allow-list of primitive values and
 * hashed correlation identifiers. Logs are an operational aid, not a copy of
 * an upstream request or a source of account data.
 */
export type OperationalEvent =
  | "quote_scheduler_started"
  | "quote_scheduler_cycle_started"
  | "quote_scheduler_cycle_finished"
  | "quote_scheduler_skipped"
  | "quote_scheduler_failed"
  | "quote_quota_projection"
  | "pluggy_scheduler_started"
  | "pluggy_scheduler_cycle_started"
  | "pluggy_fallback_skipped"
  | "pluggy_sync_finished"
  | "pluggy_sync_failed"
  | "pluggy_scheduler_cycle_finished"
  | "pluggy_webhook_finished"
  | "pluggy_webhook_failed";

const MAX_STRING_LENGTH = 120;
const SENSITIVE_KEY = /(secret|token|password|cookie|authorization|api.?key|client.?id|payload|raw|credential)/i;

function sanitizeValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) return "[redacted]";
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeValue(key, item));
  if (typeof value === "object") return sanitizeOperationalFields(value as Record<string, unknown>);
  return undefined;
}

export function sanitizeOperationalFields(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields)
      .map(([key, value]) => [key, sanitizeValue(key, value)] as const)
      .filter(([, value]) => value !== undefined),
  );
}

export function operationalCorrelationId(...parts: Array<string | null | undefined>): string {
  const value = parts.filter((part): part is string => Boolean(part)).join(":");
  return createHash("sha256").update(value || "unknown").digest("hex").slice(0, 12);
}

export function logOperationalEvent(event: OperationalEvent, fields: Record<string, unknown> = {}): void {
  console.info(`[observability] ${JSON.stringify({ event, ...sanitizeOperationalFields(fields) })}`);
}

export type QuoteQuotaStatus = "HEALTHY" | "NEAR_LIMIT" | "LIMIT_REACHED";

export interface QuoteQuotaSnapshot {
  monthlyQuota: number;
  observedCalls: number;
  estimatedCalls: number;
  remainingCalls: number;
  projectedMargin: number;
  status: QuoteQuotaStatus;
  tickers: number;
  tradingDays: number;
  intervalMinutes: number;
}

export function buildQuoteQuotaSnapshot(input: {
  observedCalls: number;
  monthlyQuota?: number;
  tradingDays?: number;
  intervalMinutes?: number;
  tickers?: number;
}): QuoteQuotaSnapshot {
  const monthlyQuota = Math.max(0, Math.floor(input.monthlyQuota ?? 15_000));
  const observedCalls = Math.max(0, Math.floor(input.observedCalls));
  const tradingDays = Math.max(1, Math.floor(input.tradingDays ?? 25));
  const intervalMinutes = Math.max(1, Math.floor(input.intervalMinutes ?? 7));
  const tickers = Math.max(1, Math.floor(input.tickers ?? STRATEGIC_ETF_TICKERS.length));
  const estimatedCalls = monthlyCallEstimate({ tickers, tradingDays, intervalMinutes });
  const remainingCalls = monthlyQuota - observedCalls;
  const projectedMargin = monthlyQuota - estimatedCalls;
  const status: QuoteQuotaStatus = remainingCalls <= 0
    ? "LIMIT_REACHED"
    : remainingCalls <= Math.max(1, Math.floor(monthlyQuota * 0.1))
      ? "NEAR_LIMIT"
      : "HEALTHY";

  return {
    monthlyQuota,
    observedCalls,
    estimatedCalls,
    remainingCalls,
    projectedMargin,
    status,
    tickers,
    tradingDays,
    intervalMinutes,
  };
}

export type PluggyOperationalCategory = "TRANSIENT_FAILURE" | "QUOTA_LIMIT" | "STALE" | "UNAVAILABLE" | "UNKNOWN";

export function classifyPluggyOperationalError(input: { status?: number; code?: string; stale?: boolean; unavailable?: boolean }): PluggyOperationalCategory {
  if (input.status === 429 || input.code?.toLowerCase().includes("quota")) return "QUOTA_LIMIT";
  if (input.stale) return "STALE";
  if (input.unavailable || input.status === 0 || (typeof input.status === "number" && input.status >= 500)) return "UNAVAILABLE";
  if (typeof input.status === "number" && input.status >= 400) return "TRANSIENT_FAILURE";
  if (input.code?.toLowerCase().includes("timeout") || input.code?.toLowerCase().includes("retry")) return "TRANSIENT_FAILURE";
  return "UNKNOWN";
}

export function getErrorCode(error: unknown): string {
  const candidate = error as { operationError?: { code?: unknown }; code?: unknown };
  if (typeof candidate?.operationError?.code === "string") return candidate.operationError.code.slice(0, MAX_STRING_LENGTH);
  if (typeof candidate?.code === "string") return candidate.code.slice(0, MAX_STRING_LENGTH);
  return "UNKNOWN_ERROR";
}

export function getErrorStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown })?.status;
  return typeof status === "number" && Number.isFinite(status) ? status : undefined;
}
