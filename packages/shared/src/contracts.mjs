import { z } from "zod";

export const errorCategorySchema = z.enum([
  "validation", "authorization", "not_found", "conflict",
  "rate_limit", "upstream", "internal",
]);

export const operationErrorSchema = z.object({
  code: z.string().min(1),
  category: errorCategorySchema,
  message: z.string().min(1),
  retryable: z.boolean(),
  hint: z.string().min(1).optional(),
  invalidFields: z.array(z.string().min(1)).optional(),
}).strict();

export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: operationErrorSchema,
}).strict();

export const successEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
}).strict();

export const emptyInputSchema = z.object({}).strict();
export const basketDetailInputSchema = z.object({ basketId: z.string().uuid() }).strict();
export const transactionHistoryInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
}).strict();

const id = z.string().min(1);
const finite = z.number().finite();
const isoDate = z.string().datetime({ offset: true });
const portfolioOutputSchema = z.object({
  totalValue: finite, positionsValue: finite, fundsValue: finite, cashBalance: finite,
  positionCount: z.number().int().nonnegative(), basketDriftPercentage: finite, unrealizedGain: finite,
  allocation: z.array(z.object({ id, ticker: id, label: id, percentage: finite, targetPercentage: finite }).strict()),
  positions: z.array(z.object({ id, ticker: id, name: id, shares: finite, averagePrice: finite, currentPrice: finite, currentValue: finite, gain: finite, gainPercentage: finite, dailyChangePercentage: finite.nullable().optional() }).strict()),
  funds: z.array(z.object({ id, name: id, indexTicker: id.optional(), initialInvestment: finite, currentValue: finite, gain: finite, gainPercentage: finite, investmentDate: isoDate }).strict()).optional(),
}).strict();
const pricesStatusOutputSchema = z.object({ success: z.boolean(), status: z.array(z.object({ ticker: id, lastUpdate: isoDate.nullable(), staleDays: z.number().int() }).strict()), timestamp: isoDate }).strict();
const rebalanceOutputSchema = z.object({
  portfolioValue: finite, investedValue: finite.optional(), cashAvailable: finite.optional(), calculationBaseValue: finite.optional(), rebalanceCost: finite.optional(), postRebalanceCash: finite.optional(), includeCash: z.boolean().optional(),
  driftPercentage: finite, targetBasketName: z.string(), actions: z.array(z.object({ id, ticker: id, action: z.enum(["APORTAR", "REDUZIR"]), amount: finite, currentPrice: finite, currentPercentage: finite, targetPercentage: finite }).strict()),
  eligibleForRebalance: z.boolean().optional(), missingProfileFields: z.array(z.string()).optional(),
}).strict();
const assetsOutputSchema = z.array(z.object({ id, ticker: id, name: id }).strict());
const assetPricesOutputSchema = z.array(z.object({ ticker: id, name: id, calculationType: id, price: finite.nullable(), priceDate: z.string().nullable() }).strict());
const fundsOutputSchema = z.array(z.object({ currentValue: finite, id, indexAssetName: z.string().nullable(), indexAssetTicker: z.string().nullable(), initialInvestment: finite, investmentDate: isoDate, name: id, updatedAt: isoDate }).strict());
const basketsOutputSchema = z.array(z.object({ id, name: id, assetCount: z.number().int().nonnegative(), status: z.enum(["ATIVA", "RASCUNHO"]) }).strict());
const basketOutputSchema = z.object({ id, name: id, status: z.enum(["ATIVA", "RASCUNHO"]), description: z.string().nullable(), allocations: z.array(z.object({ id, ticker: id, name: id, targetPercentage: finite }).strict()) }).strict();
const transactionsOutputSchema = z.array(z.object({ id, assetTicker: id, assetName: id, type: z.enum(["COMPRA", "VENDA"]), shares: finite, pricePerShare: finite, amount: finite, tradedAt: isoDate, dateLabel: id }).strict());
export const loginOutputSchema = z.object({
  token: z.string().min(1),
  user: z.object({ id, email: z.string().email() }).passthrough(),
}).passthrough();

const definitions = [
  ["portfolio_summary", "Current portfolio snapshot: total value, positions, allocation, drift, funds, cash.", "/api/portfolio/summary", emptyInputSchema, portfolioOutputSchema],
  ["prices_status", "Price update status for all assets: last update date, stale days per ticker.", "/api/admin/prices", emptyInputSchema, pricesStatusOutputSchema],
  ["rebalance_preview", "Rebalance preview: drift, target basket, buy/sell actions with amounts.", "/api/rebalance/preview", emptyInputSchema, rebalanceOutputSchema],
  ["list_assets", "List all available assets with ticker and name.", "/api/assets", emptyInputSchema, assetsOutputSchema],
  ["asset_prices", "Current prices for all assets: ticker, name, price, price date, calculation type.", "/api/assets/prices", emptyInputSchema, assetPricesOutputSchema],
  ["funds_summary", "Summary of all funds: name, ticker, initial investment, current value, last update.", "/api/funds", emptyInputSchema, fundsOutputSchema],
  ["list_baskets", "List all baskets: name, status (ATIVA/RASCUNHO), asset count.", "/api/baskets", emptyInputSchema, basketsOutputSchema],
  ["basket_detail", "Detail of a specific basket: name, status, allocations with target percentages.", "/api/baskets/:basketId", basketDetailInputSchema, basketOutputSchema],
  ["transaction_history", "Recent transactions: asset, type (COMPRA/VENDA), shares, price, amount, date.", "/api/transactions", transactionHistoryInputSchema, transactionsOutputSchema],
];

export const operationCatalog = Object.freeze(Object.fromEntries(definitions.map(([name, description, path, inputSchema, outputSchema]) => [name, Object.freeze({ name, description, path, inputSchema, outputSchema })])));
export const responseSchemaCatalog = Object.freeze({
  ...Object.fromEntries(Object.entries(operationCatalog).map(([name, contract]) => [name, contract.outputSchema])),
  login: loginOutputSchema,
});

export function operationPath(operation, input = {}) {
  const contract = operationCatalog[operation];
  if (!contract) throw operationFailure("UNKNOWN_OPERATION", "validation", `Unknown operation: ${operation}`, false);
  const parsed = contract.inputSchema.safeParse(input ?? {});
  if (!parsed.success) {
    throw operationFailure("INVALID_INPUT", "validation", "Operation input is invalid", false, {
      invalidFields: [...new Set(parsed.error.issues.map((issue) => issue.path.join(".") || "input"))],
    });
  }
  const path = contract.path.replace(":basketId", parsed.data.basketId ?? "");
  if (operation === "transaction_history" && parsed.data.limit !== undefined) {
    return `${path}?limit=${parsed.data.limit}`;
  }
  return path;
}

export function operationFailure(code, category, message, retryable, details = {}) {
  const error = operationErrorSchema.parse({ code, category, message, retryable, ...details });
  return Object.assign(new Error(error.message), { operationError: error });
}

export function toOperationError(value, fallback = {}) {
  const direct = operationErrorSchema.safeParse(value?.operationError ?? value);
  if (direct.success) return direct.data;
  return operationErrorSchema.parse({
    code: fallback.code ?? "INTERNAL_ERROR",
    category: fallback.category ?? "internal",
    message: value instanceof Error ? value.message : (fallback.message ?? "Unexpected error"),
    retryable: fallback.retryable ?? false,
  });
}

export function errorEnvelope(error) {
  return errorEnvelopeSchema.parse({ success: false, error: toOperationError(error) });
}

export function mcpErrorResult(error, fallback = {}) {
  return { content: [{ type: "text", text: JSON.stringify(errorEnvelope(toOperationError(error, fallback))) }], isError: true };
}

export async function executeMcpReadOperation(operation, input, request) {
  try {
    const path = operationPath(operation, input);
    const result = await request(path, operation);
    if (!result.ok) return mcpErrorResult(result.operationError, { code: "OPERATION_FAILED", category: "upstream", retryable: true });
    return { content: [{ type: "text", text: JSON.stringify({ success: true, data: result.data }, null, 2) }] };
  } catch (error) {
    return mcpErrorResult(error, { code: "OPERATION_FAILED", category: "upstream", retryable: true });
  }
}

export async function executeCliReadOperation(operation, input, request) {
  const path = operationPath(operation, input);
  const result = await request(path, operation);
  if (!result.ok) throw Object.assign(new Error(result.operationError?.message ?? "Operation failed"), { operationError: result.operationError });
  return { success: true, data: result.data };
}

export function operationToMcpTool(contract) {
  return { name: contract.name, description: contract.description, inputSchema: zodObjectToJsonSchema(contract.inputSchema) };
}

function zodObjectToJsonSchema(schema) {
  const shape = schema.shape;
  const properties = {};
  const required = [];
  for (const [key, field] of Object.entries(shape)) {
    const base = field._def.typeName === "ZodOptional" ? field.unwrap() : field;
    const isNumber = base._def.typeName === "ZodNumber";
    properties[key] = isNumber
      ? {
          type: "integer",
          ...(base._def.checks?.find((c) => c.kind === "min") ? { minimum: base._def.checks.find((c) => c.kind === "min").value } : {}),
          ...(base._def.checks?.find((c) => c.kind === "max") ? { maximum: base._def.checks.find((c) => c.kind === "max").value } : {}),
        }
      : { type: "string", ...(base._def.checks?.some((c) => c.kind === "uuid") ? { format: "uuid" } : {}) };
    if (!field.isOptional()) required.push(key);
  }
  return { type: "object", properties, required, additionalProperties: false };
}
