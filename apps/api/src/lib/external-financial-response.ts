import { operationFailure } from "@paridade-risco/shared/contracts";
import { z } from "zod";

const yahooResponseSchema = z.object({
  chart: z.object({
    result: z.array(z.object({
      timestamp: z.array(z.number().int().nonnegative()),
      indicators: z.object({
        quote: z.array(z.object({ close: z.array(z.number().finite().nullable()) }).passthrough()).min(1),
      }).passthrough(),
    }).passthrough()).nullable(),
    error: z.object({ code: z.string(), description: z.string() }).strict().nullable(),
  }).passthrough(),
}).passthrough();

const bcbResponseSchema = z.array(z.object({
  valor: z.string().regex(/^-?\d+(?:[.,]\d+)?$/),
  data: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
}).strict());

export type YahooFinanceResponse = z.infer<typeof yahooResponseSchema>;
export type BCBResponse = z.infer<typeof bcbResponseSchema>;

export async function readExternalJson(response: Response, provider: string): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!/^(application\/json|[^;]+\+json)(?:;|$)/i.test(contentType.trim())) {
    throw operationFailure("UPSTREAM_CONTENT_TYPE_INVALID", "upstream", `${provider} returned a non-JSON response`, false);
  }
  try {
    return await response.json();
  } catch {
    throw operationFailure("UPSTREAM_JSON_INVALID", "upstream", `${provider} returned invalid JSON`, false);
  }
}

export function parseYahooResponse(value: unknown): YahooFinanceResponse {
  const parsed = yahooResponseSchema.safeParse(value);
  if (!parsed.success) throw operationFailure("UPSTREAM_SCHEMA_INVALID", "upstream", "Yahoo Finance response schema is incompatible", false);
  return parsed.data;
}

export function parseBCBResponse(value: unknown): BCBResponse {
  const parsed = bcbResponseSchema.safeParse(value);
  if (!parsed.success) throw operationFailure("UPSTREAM_SCHEMA_INVALID", "upstream", "BCB response schema is incompatible", false);
  return parsed.data;
}

export function classifyExternalError(error: unknown, provider: string) {
  if ((error as { operationError?: unknown })?.operationError) return error;
  const name = (error as { name?: string })?.name;
  if (name === "AbortError" || name === "TimeoutError") {
    return operationFailure("UPSTREAM_TIMEOUT", "upstream", `${provider} request timed out`, true);
  }
  return operationFailure("UPSTREAM_UNAVAILABLE", "upstream", `${provider} request failed`, true);
}
