// Schemas — Zod validation schemas
export {
  transactionTypeSchema,
  basketStatusSchema,
  assetTypeSchema,
  createTransactionSchema,
  loginSchema,
  basketAllocationSchema,
  updateBasketSchema,
  createBasketSchema,
} from "./schemas";

export type {
  TransactionType,
  BasketStatus,
  AssetType,
  CreateTransactionInput,
  LoginInput,
  UpdateBasketInput,
  CreateBasketInput,
} from "./schemas";

// Operations — pure business logic (no DB dependency)
export {
  buildRebalancePreview,
  getRebalanceEligibility,
  calculateDrift,
} from "./operations/rebalance";

export {
  toNumber,
  formatDateForBCB,
  parseBCBDate,
  toUtcDayStart,
  addUtcDays,
  toUtcDayKey,
} from "./operations/helpers";

// Domain types
export type {
  PriceDataPoint,
  PriceSource,
  AssetPriceUpdateResult,
  AssetPriceStatus,
  RawPosition,
  PortfolioSnapshot,
  BasketAllocation,
  ActiveBasket,
  RebalanceAction,
  RebalancePreview,
  RebalanceEligibility,
  RebalanceFullPreview,
  AllocationSlice,
  FundSnapshot,
  PositionDetail,
  PortfolioSummary,
  AssetCalculationType,
  UserRole,
} from "./types/domain";

// Theme (shared between web and mobile)
export { colors } from "./theme/colors";
export { layout } from "./theme/layout";

// Formatters (shared between web and mobile)
export {
  formatCurrency,
  formatSignedCurrency,
  formatPercentage,
  formatDate,
  formatDateTime,
} from "./formatters";

export {
  errorCategorySchema,
  operationErrorSchema,
  errorEnvelopeSchema,
  successEnvelopeSchema,
  operationCatalog,
  operationPath,
  operationFailure,
  toOperationError,
  errorEnvelope,
  mcpErrorResult,
  executeMcpReadOperation,
  operationToMcpTool,
} from "./contracts.mjs";

export type OperationError = import("zod").infer<typeof import("./contracts.mjs").operationErrorSchema>;
