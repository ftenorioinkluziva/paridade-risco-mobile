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
const pluggyPeriodInputSchema = z.object({
  days: z.number().int().min(1).max(365).optional(),
}).strict();
const pluggyRebalanceInputSchema = z.object({
  cashForOrders: z.number().finite().min(0).optional(),
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
const nullableFinite = finite.nullable();
const nullableDate = isoDate.nullable();
const monthlyCashFlowSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  income: finite, otherInflows: finite, expenses: finite, bankExpenses: finite,
  cardSpend: finite, cardPaymentsExcluded: finite, net: finite,
  transactionCount: z.number().int().nonnegative(),
}).passthrough();
const pluggyFreshnessSchema = z.object({
  status: z.enum(["FRESH", "STALE", "UNAVAILABLE"]).optional(),
  latestObservedAt: nullableDate,
  latestSyncAt: nullableDate,
  latestSyncStatus: z.string().nullable().optional(),
  ageMinutes: nullableFinite.optional(),
  staleAfterMinutes: finite.optional(),
}).passthrough();
const pluggyFinancialOverviewSchema = z.object({
  source: z.literal("PLUGGY"), generatedAt: isoDate, freshness: pluggyFreshnessSchema,
  period: z.object({ from: isoDate, to: isoDate, days: z.number().int().positive() }).passthrough(),
  cash: z.object({ balance: finite, availableBalance: finite, accounts: z.array(z.object({ id, name: id, balance: finite, availableBalance: nullableFinite, observedAt: isoDate }).passthrough()) }).passthrough(),
  credit: z.object({
    cards: z.array(z.object({ id, name: id, balance: finite, balanceDue: finite, creditLimit: nullableFinite, availableCredit: nullableFinite, creditUtilization: nullableFinite, minimumPayment: nullableFinite, balanceDueDate: nullableDate, balanceCloseDate: nullableDate, obligationStatus: z.string(), observedAt: isoDate }).passthrough()),
    totalBalanceDue: finite, totalCreditLimit: finite,
  }).passthrough(),
  cashFlow: z.object({
    income: finite, otherInflows: finite, expenses: finite, bankExpenses: finite,
    cardSpend: finite, cardPaymentsExcluded: finite, net: finite,
    transactionCount: z.number().int().nonnegative(),
    currentMonth: monthlyCashFlowSchema,
    previousMonth: monthlyCashFlowSchema,
  }).passthrough(),
  obligations: z.object({
    items: z.array(z.object({ id, kind: id, accountId: id, accountName: id, amount: finite, minimumPayment: nullableFinite, dueDate: nullableDate, status: z.string() }).passthrough()),
    upcomingTotal: finite, cashAfterUpcoming: finite, horizonDays: z.number().int().nonnegative(),
  }).passthrough(),
  liquidityStatus: z.enum(["SUFICIENTE", "INSUFICIENTE", "NAO_CALCULADA"]), warnings: z.array(z.string()),
}).passthrough();
const pluggyFinancialHealthSchema = z.object({
  source: z.literal("PLUGGY"), generatedAt: isoDate, healthStatus: z.enum(["ESTAVEL", "ATENCAO", "INCOMPLETA"]), financial: pluggyFinancialOverviewSchema,
  loans: z.object({
    dataStatus: z.enum(["DISPONIVEL", "INCOMPLETA", "SEM_REGISTROS"]),
    items: z.array(z.object({ id, name: z.string().nullable(), status: z.string().nullable(), originalAmount: nullableFinite, outstandingBalance: nullableFinite, installmentAmount: nullableFinite, interestRate: nullableFinite, nextDueDate: nullableDate, maturityDate: nullableDate, dataStatus: z.string(), observedAt: isoDate }).passthrough()),
    totalOutstanding: nullableFinite, totalInstallment: nullableFinite, nextDueDate: nullableDate,
  }).passthrough(),
  indicators: z.object({ knownDebt: nullableFinite, debtServiceToIncome: nullableFinite, maxCardUtilization: nullableFinite, cashAfterUpcomingObligations: finite, cashFlowNet: finite }).passthrough(),
  alerts: z.array(z.object({ code: id, severity: z.enum(["INFO", "MEDIUM", "HIGH"]), message: id, source: id }).strict()),
}).passthrough();
const pluggyProjectionSchema = z.object({
  generatedAt: isoDate, freshness: pluggyFreshnessSchema,
  connections: z.array(z.object({ id, itemId: id, environment: id, connectorName: z.string().nullable(), status: id, consentExpiresAt: nullableDate, lastSyncStatus: z.string().nullable(), lastSyncAt: nullableDate, lastError: z.string().nullable() }).passthrough()),
  accounts: z.array(z.object({ id, connectionId: id, itemId: id, sourceAccountId: id, name: id, type: z.string().nullable(), subtype: z.string().nullable(), balance: nullableFinite, availableBalance: nullableFinite, creditLimit: nullableFinite, availableCreditLimit: nullableFinite, minimumPayment: nullableFinite, balanceDueDate: nullableDate, isCreditCard: z.boolean(), observedAt: isoDate }).passthrough()),
  investments: z.array(z.object({
    id, connectionId: id, itemId: id, sourceInvestmentId: id, providerId: z.string().nullable(), code: z.string().nullable(), isin: z.string().nullable(), name: id, type: z.string().nullable(), subtype: z.string().nullable(), issuer: z.string().nullable(), quantity: nullableFinite, currentValue: finite, originalValue: nullableFinite, profitValue: nullableFinite, costBasisAvailable: z.boolean(), observedAt: isoDate, mappingId: z.string().nullable(), decisionReason: z.string().nullable(), classification: z.object({ riskBucket: id, mappingStatus: id, reason: id }).strict(), mappingCandidate: z.object({ assetId: id, ticker: id, name: id, type: id }).nullable(),
  }).passthrough()),
  totals: z.object({ totalInvestedValue: finite, totalOriginalValue: nullableFinite, totalProfitValue: nullableFinite, byRiskBucket: z.record(finite), mappedCount: z.number().int().nonnegative(), suggestedCount: z.number().int().nonnegative(), pendingCount: z.number().int().nonnegative(), outsideStrategyCount: z.number().int().nonnegative(), missingCostBasisCount: z.number().int().nonnegative() }).passthrough(),
}).passthrough();
const pluggyRebalancePreviewSchema = z.object({
  source: z.literal("PLUGGY"), portfolioValue: finite, investedValue: finite, cashAvailable: finite, cashForOrders: finite, cashHeldInReserve: finite, calculationBaseValue: finite, rebalanceCost: finite, buyRequired: finite, sellProceeds: finite, postRebalanceCash: finite, includeCash: z.boolean(), liquidityStatus: z.enum(["SUFICIENTE", "INSUFICIENTE", "NAO_CALCULADA"]), executionReady: z.boolean(), eligibleForRebalance: z.boolean(), missingProfileFields: z.array(z.string()), analysisStatus: z.enum(["COMPLETA", "PARCIAL"]), observedInvestedValue: finite, outsideStrategyValue: finite, unresolvedValue: finite, unresolvedCount: z.number().int().nonnegative(), mappingCoveragePercentage: nullableFinite, warnings: z.array(z.string()), driftPercentage: finite, targetBasketName: id,
  actions: z.array(z.object({ id, ticker: id, action: z.enum(["APORTAR", "REDUZIR"]), amount: finite, currentPrice: finite, currentPercentage: finite, targetPercentage: finite }).strict()),
}).passthrough();
const pluggyMigrationReadinessSchema = z.object({
  source: z.literal("PLUGGY"), generatedAt: isoDate, currentMode: z.enum(["MANUAL", "PLUGGY", "DUAL_READ"]), candidateMode: z.literal("PLUGGY"), status: z.enum(["READY", "BLOCKED"]), canSwitchToPluggy: z.boolean(), manualCrudStatus: z.literal("ACTIVE"),
  manualCrud: z.object({ transactions: z.literal("ACTIVE"), funds: z.literal("ACTIVE"), reason: id }).strict(),
  reconciliation: z.object({ status: z.enum(["ALINHADO", "DIVERGENTE"]), considered: z.boolean(), baseline: z.enum(["PLUGGY_ONLY_SANDBOX", "MANUAL_AND_PLUGGY"]) }).strict(),
  comparison: z.object({ status: z.enum(["ALINHADO", "DIVERGENTE"]), totalValueDelta: finite, investedValueDelta: finite, cashBalanceDelta: finite, positionValueDelta: finite, byTicker: z.array(z.object({ ticker: id, manualValue: finite, pluggyValue: finite, delta: finite, status: z.enum(["ALINHADO", "DIVERGENTE"]) }).strict()) }).strict(),
  blockers: z.array(z.string()), warnings: z.array(z.string()), nextAction: id,
}).passthrough();
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
  ["pluggy_financial_overview", "Pluggy financial overview: cash, credit cards, cash flow, upcoming obligations, liquidity and data freshness.", "/api/integrations/pluggy/financial-overview", pluggyPeriodInputSchema, pluggyFinancialOverviewSchema],
  ["pluggy_financial_health", "Pluggy financial health: status, debt indicators, alerts and observed loans for a selected period.", "/api/integrations/pluggy/financial-health", pluggyPeriodInputSchema, pluggyFinancialHealthSchema],
  ["pluggy_investment_projection", "Pluggy investment projection: observed investments, mapping decisions, classifications, totals and sync freshness.", "/api/integrations/pluggy/projection", emptyInputSchema, pluggyProjectionSchema],
  ["pluggy_rebalance_preview", "Pluggy rebalance preview: active basket adherence, coverage, planned order cash, liquidity, blockers and suggested actions.", "/api/integrations/pluggy/rebalance/preview", pluggyRebalanceInputSchema, pluggyRebalancePreviewSchema],
  ["pluggy_migration_readiness", "Pluggy migration readiness: current source, reconciliation, blockers and next action.", "/api/integrations/pluggy/migration-readiness", emptyInputSchema, pluggyMigrationReadinessSchema],
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
  if (["pluggy_financial_overview", "pluggy_financial_health"].includes(operation) && parsed.data.days !== undefined) {
    return `${path}?days=${parsed.data.days}`;
  }
  if (operation === "pluggy_rebalance_preview" && parsed.data.cashForOrders !== undefined) {
    return `${path}?cashForOrders=${encodeURIComponent(parsed.data.cashForOrders)}`;
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
    const isInteger = isNumber && base._def.checks?.some((c) => c.kind === "int");
    properties[key] = isNumber
      ? {
          type: isInteger ? "integer" : "number",
          ...(base._def.checks?.find((c) => c.kind === "min") ? { minimum: base._def.checks.find((c) => c.kind === "min").value } : {}),
          ...(base._def.checks?.find((c) => c.kind === "max") ? { maximum: base._def.checks.find((c) => c.kind === "max").value } : {}),
        }
      : { type: "string", ...(base._def.checks?.some((c) => c.kind === "uuid") ? { format: "uuid" } : {}) };
    if (!field.isOptional()) required.push(key);
  }
  return { type: "object", properties, required, additionalProperties: false };
}
