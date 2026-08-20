import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const assetTypeEnum = pgEnum("asset_type", [
  "ETF",
  "RENDA_FIXA",
  "CRYPTO",
  "COMMODITY",
  "CAIXA",
  "OUTRO",
]);

export const assetCalculationTypeEnum = pgEnum("asset_calculation_type", ["PRECO", "PERCENTUAL"]);

export const transactionTypeEnum = pgEnum("transaction_type", ["COMPRA", "VENDA"]);

export const basketStatusEnum = pgEnum("basket_status", ["ATIVA", "RASCUNHO"]);

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "USER"]);

export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  phone: text("phone"),
  telegramChatId: text("telegram_chat_id"),
  passwordHash: text("password_hash"),
  image: text("image"),
  role: text("role").default("user").notNull(),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  birthDate: timestamp("birth_date", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  selectedBasketId: text("selected_basket_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
}));

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  token: text("token").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  impersonatedBy: text("impersonated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  tokenIdx: uniqueIndex("sessions_token_idx").on(table.token),
  userIdx: index("sessions_user_idx").on(table.userId),
}));

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  issuer: text("issuer").notNull().default(""),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userIdx: index("accounts_user_idx").on(table.userId),
}));

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  identifierIdx: index("verifications_identifier_idx").on(table.identifier),
}));

export const assets = pgTable("assets", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  ticker: text("ticker").notNull(),
  sourceTicker: text("source_ticker"),
  name: text("name").notNull(),
  type: assetTypeEnum("type").notNull(),
  calculationType: assetCalculationTypeEnum("calculation_type").notNull().default("PRECO"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  tickerIdx: uniqueIndex("assets_ticker_idx").on(table.ticker),
}));

export const historicalPrices = pgTable("historical_prices", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  priceDate: timestamp("price_date", { withTimezone: true }).notNull(),
  price: numeric("price", { precision: 16, scale: 4 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  assetDateIdx: uniqueIndex("historical_prices_asset_date_idx").on(table.assetId, table.priceDate),
  assetSearchIdx: index("historical_prices_asset_search_idx").on(table.assetId),
}));

export const portfolios = pgTable("portfolios", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cashBalance: numeric("cash_balance", { precision: 16, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userIdx: uniqueIndex("portfolios_user_idx").on(table.userId),
}));

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: "restrict" }),
  type: transactionTypeEnum("type").notNull(),
  shares: numeric("shares", { precision: 16, scale: 8 }).notNull(),
  pricePerShare: numeric("price_per_share", { precision: 16, scale: 4 }).notNull(),
  tradedAt: timestamp("traded_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userTradedIdx: index("transactions_user_traded_idx").on(table.userId, table.tradedAt),
  assetTradedIdx: index("transactions_asset_traded_idx").on(table.assetId, table.tradedAt),
}));

export const baskets = pgTable("baskets", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: basketStatusEnum("status").notNull().default("RASCUNHO"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userNameIdx: uniqueIndex("baskets_user_name_idx").on(table.userId, table.name),
}));

export const basketAllocations = pgTable("basket_allocations", {
  basketId: text("basket_id").notNull().references(() => baskets.id, { onDelete: "cascade" }),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: "restrict" }),
  targetPercentage: numeric("target_percentage", { precision: 5, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.basketId, table.assetId], name: "basket_allocations_pk" }),
}));

export const investmentFunds = pgTable("investment_funds", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  initialInvestment: numeric("initial_investment", { precision: 16, scale: 2 }).notNull(),
  currentValue: numeric("current_value", { precision: 16, scale: 2 }).notNull(),
  investmentDate: timestamp("investment_date", { withTimezone: true }).notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  indexAssetId: text("index_asset_id").references(() => assets.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  userIdx: index("investment_funds_user_idx").on(table.userId),
  indexAssetIdx: index("investment_funds_index_asset_idx").on(table.indexAssetId),
}));

export const idempotencyRecords = pgTable("idempotency_records", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  operation: text("operation").notNull(),
  key: text("key").notNull(),
  requestHash: text("request_hash").notNull(),
  responseBody: jsonb("response_body").notNull(),
  responseStatus: integer("response_status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => ({
  scopeIdx: uniqueIndex("idempotency_records_scope_idx").on(table.userId, table.operation, table.key),
  expiresAtIdx: index("idempotency_records_expires_at_idx").on(table.expiresAt),
}));

export const portfolioSourcePreferences = pgTable("portfolio_source_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  sourceMode: text("source_mode").notNull().default("MANUAL"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
});

export const liveQuotes = pgTable("live_quotes", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  assetId: text("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  topic: text("topic").notNull(),
  quoteDate: text("quote_date"),
  quoteTime: text("quote_time"),
  last: numeric("last", { precision: 20, scale: 8 }),
  open: numeric("open", { precision: 20, scale: 8 }),
  high: numeric("high", { precision: 20, scale: 8 }),
  low: numeric("low", { precision: 20, scale: 8 }),
  strike: numeric("strike", { precision: 20, scale: 8 }),
  trades: integer("trades"),
  expiration: text("expiration"),
  rawData: jsonb("raw_data").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  assetSourceIdx: uniqueIndex("live_quotes_asset_source_idx").on(table.assetId, table.source),
  receivedAtIdx: index("live_quotes_received_at_idx").on(table.receivedAt),
}));

export const pluggyConnections = pgTable("pluggy_connections", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull(),
  environment: text("environment").notNull().default("sandbox"),
  connectorId: text("connector_id"),
  connectorName: text("connector_name"),
  status: text("status").notNull().default("UNKNOWN"),
  consentExpiresAt: timestamp("consent_expires_at", { withTimezone: true }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncStatus: text("last_sync_status"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  itemIdx: uniqueIndex("pluggy_connections_item_idx").on(table.itemId),
  userIdx: index("pluggy_connections_user_idx").on(table.userId),
}));

export const pluggyAccounts = pgTable("pluggy_accounts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  connectionId: text("connection_id").notNull().references(() => pluggyConnections.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceAccountId: text("source_account_id").notNull(),
  type: text("type"),
  subtype: text("subtype"),
  name: text("name").notNull(),
  balance: numeric("balance", { precision: 20, scale: 4 }),
  availableBalance: numeric("available_balance", { precision: 20, scale: 4 }),
  creditLimit: numeric("credit_limit", { precision: 20, scale: 4 }),
  availableCreditLimit: numeric("available_credit_limit", { precision: 20, scale: 4 }),
  balanceDueDate: timestamp("balance_due_date", { withTimezone: true }),
  balanceCloseDate: timestamp("balance_close_date", { withTimezone: true }),
  minimumPayment: numeric("minimum_payment", { precision: 20, scale: 4 }),
  currencyCode: text("currency_code"),
  status: text("status"),
  rawData: jsonb("raw_data").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  sourceIdx: uniqueIndex("pluggy_accounts_source_idx").on(table.connectionId, table.sourceAccountId),
  userIdx: index("pluggy_accounts_user_idx").on(table.userId),
}));

export const pluggyInvestments = pgTable("pluggy_investments", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  connectionId: text("connection_id").notNull().references(() => pluggyConnections.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceInvestmentId: text("source_investment_id").notNull(),
  providerId: text("provider_id"),
  code: text("code"),
  isin: text("isin"),
  investmentNumber: text("investment_number"),
  name: text("name").notNull(),
  type: text("type"),
  subtype: text("subtype"),
  quantity: numeric("quantity", { precision: 24, scale: 8 }),
  balance: numeric("balance", { precision: 20, scale: 4 }),
  amountOriginal: numeric("amount_original", { precision: 20, scale: 4 }),
  amountProfit: numeric("amount_profit", { precision: 20, scale: 4 }),
  amountWithdrawal: numeric("amount_withdrawal", { precision: 20, scale: 4 }),
  currencyCode: text("currency_code"),
  issuer: text("issuer"),
  status: text("status"),
  rawData: jsonb("raw_data").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  sourceIdx: uniqueIndex("pluggy_investments_source_idx").on(table.connectionId, table.sourceInvestmentId),
  userIdx: index("pluggy_investments_user_idx").on(table.userId),
  identifierIdx: index("pluggy_investments_identifier_idx").on(table.isin, table.code),
}));

export const pluggyInvestmentMappings = pgTable("pluggy_investment_mappings", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pluggyInvestmentId: text("pluggy_investment_id").notNull().references(() => pluggyInvestments.id, { onDelete: "cascade" }),
  assetId: text("asset_id").references(() => assets.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("MAPEADO"),
  decisionReason: text("decision_reason"),
  approvedAt: timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  investmentIdx: uniqueIndex("pluggy_investment_mappings_investment_idx").on(table.userId, table.pluggyInvestmentId),
  userIdx: index("pluggy_investment_mappings_user_idx").on(table.userId),
  assetIdx: index("pluggy_investment_mappings_asset_idx").on(table.assetId),
}));

export const pluggyLoans = pgTable("pluggy_loans", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  connectionId: text("connection_id").notNull().references(() => pluggyConnections.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceLoanId: text("source_loan_id").notNull(),
  name: text("name"),
  status: text("status"),
  originalAmount: numeric("original_amount", { precision: 20, scale: 4 }),
  outstandingBalance: numeric("outstanding_balance", { precision: 20, scale: 4 }),
  installmentAmount: numeric("installment_amount", { precision: 20, scale: 4 }),
  interestRate: numeric("interest_rate", { precision: 12, scale: 6 }),
  nextDueDate: timestamp("next_due_date", { withTimezone: true }),
  maturityDate: timestamp("maturity_date", { withTimezone: true }),
  rawData: jsonb("raw_data").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  sourceIdx: uniqueIndex("pluggy_loans_source_idx").on(table.connectionId, table.sourceLoanId),
  userIdx: index("pluggy_loans_user_idx").on(table.userId),
}));

export const pluggyTransactions = pgTable("pluggy_transactions", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  connectionId: text("connection_id").notNull().references(() => pluggyConnections.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull().references(() => pluggyAccounts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceTransactionId: text("source_transaction_id").notNull(),
  sourceAccountId: text("source_account_id").notNull(),
  transactionDate: timestamp("transaction_date", { withTimezone: true }),
  description: text("description"),
  amount: numeric("amount", { precision: 20, scale: 4 }),
  type: text("type"),
  status: text("status"),
  category: text("category"),
  merchantName: text("merchant_name"),
  installmentNumber: integer("installment_number"),
  totalInstallments: integer("total_installments"),
  totalAmount: numeric("total_amount", { precision: 20, scale: 4 }),
  billId: text("bill_id"),
  purchaseDate: timestamp("purchase_date", { withTimezone: true }),
  rawData: jsonb("raw_data").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  sourceIdx: uniqueIndex("pluggy_transactions_source_idx").on(table.connectionId, table.sourceTransactionId),
  accountDateIdx: index("pluggy_transactions_account_date_idx").on(table.accountId, table.transactionDate),
  userDateIdx: index("pluggy_transactions_user_date_idx").on(table.userId, table.transactionDate),
}));

export const pluggySyncRuns = pgTable("pluggy_sync_runs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  connectionId: text("connection_id").notNull().references(() => pluggyConnections.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  counts: jsonb("counts"),
  error: text("error"),
  }, (table) => ({
    connectionStartedIdx: index("pluggy_sync_runs_connection_started_idx").on(table.connectionId, table.startedAt),
    userStartedIdx: index("pluggy_sync_runs_user_started_idx").on(table.userId, table.startedAt),
    runningUserIdx: uniqueIndex("pluggy_sync_runs_one_running_user_idx").on(table.userId).where(sql`${table.status} = 'RUNNING'`),
  }));

export const pluggyWebhookEvents = pgTable("pluggy_webhook_events", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  eventId: text("event_id").notNull(),
  event: text("event").notNull(),
  itemId: text("item_id"),
  accountId: text("account_id"),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("RECEIVED"),
  attempts: integer("attempts").notNull().default(0),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}, (table) => ({
  eventIdIdx: uniqueIndex("pluggy_webhook_events_event_id_idx").on(table.eventId),
  statusAttemptIdx: index("pluggy_webhook_events_status_attempt_idx").on(table.status, table.nextAttemptAt),
  itemReceivedIdx: index("pluggy_webhook_events_item_received_idx").on(table.itemId, table.receivedAt),
}));

export const userPluggyCredentials = pgTable("user_pluggy_credentials", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  itemId: text("item_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdateFn(() => new Date()),
});

export const userPluggyCredentialsRelations = relations(userPluggyCredentials, ({ one }) => ({
  user: one(users, { fields: [userPluggyCredentials.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  baskets: many(baskets),
  portfolio: one(portfolios, { fields: [users.id], references: [portfolios.userId] }),
  transactions: many(transactions),
  selectedBasket: one(baskets, { fields: [users.selectedBasketId], references: [baskets.id] }),
  sessions: many(sessions),
  investmentFunds: many(investmentFunds),
  portfolioSourcePreference: one(portfolioSourcePreferences, { fields: [users.id], references: [portfolioSourcePreferences.userId] }),
  pluggyCredentials: one(userPluggyCredentials, { fields: [users.id], references: [userPluggyCredentials.userId] }),
  pluggyConnections: many(pluggyConnections),
  pluggyAccounts: many(pluggyAccounts),
  pluggyInvestments: many(pluggyInvestments),
  pluggyInvestmentMappings: many(pluggyInvestmentMappings),
  pluggyLoans: many(pluggyLoans),
  pluggyTransactions: many(pluggyTransactions),
  pluggySyncRuns: many(pluggySyncRuns),
}));

export const pluggyConnectionsRelations = relations(pluggyConnections, ({ one, many }) => ({
  user: one(users, { fields: [pluggyConnections.userId], references: [users.id] }),
  accounts: many(pluggyAccounts),
  investments: many(pluggyInvestments),
  loans: many(pluggyLoans),
  transactions: many(pluggyTransactions),
  syncRuns: many(pluggySyncRuns),
}));

export const portfolioSourcePreferencesRelations = relations(portfolioSourcePreferences, ({ one }) => ({
  user: one(users, { fields: [portfolioSourcePreferences.userId], references: [users.id] }),
}));

export const pluggyAccountsRelations = relations(pluggyAccounts, ({ one, many }) => ({
  connection: one(pluggyConnections, { fields: [pluggyAccounts.connectionId], references: [pluggyConnections.id] }),
  user: one(users, { fields: [pluggyAccounts.userId], references: [users.id] }),
  transactions: many(pluggyTransactions),
}));

export const pluggyInvestmentsRelations = relations(pluggyInvestments, ({ one }) => ({
  connection: one(pluggyConnections, { fields: [pluggyInvestments.connectionId], references: [pluggyConnections.id] }),
  user: one(users, { fields: [pluggyInvestments.userId], references: [users.id] }),
  mapping: one(pluggyInvestmentMappings, { fields: [pluggyInvestments.id], references: [pluggyInvestmentMappings.pluggyInvestmentId] }),
}));

export const pluggyInvestmentMappingsRelations = relations(pluggyInvestmentMappings, ({ one }) => ({
  user: one(users, { fields: [pluggyInvestmentMappings.userId], references: [users.id] }),
  investment: one(pluggyInvestments, { fields: [pluggyInvestmentMappings.pluggyInvestmentId], references: [pluggyInvestments.id] }),
  asset: one(assets, { fields: [pluggyInvestmentMappings.assetId], references: [assets.id] }),
}));

export const pluggyLoansRelations = relations(pluggyLoans, ({ one }) => ({
  connection: one(pluggyConnections, { fields: [pluggyLoans.connectionId], references: [pluggyConnections.id] }),
  user: one(users, { fields: [pluggyLoans.userId], references: [users.id] }),
}));

export const pluggyTransactionsRelations = relations(pluggyTransactions, ({ one }) => ({
  connection: one(pluggyConnections, { fields: [pluggyTransactions.connectionId], references: [pluggyConnections.id] }),
  account: one(pluggyAccounts, { fields: [pluggyTransactions.accountId], references: [pluggyAccounts.id] }),
  user: one(users, { fields: [pluggyTransactions.userId], references: [users.id] }),
}));

export const pluggySyncRunsRelations = relations(pluggySyncRuns, ({ one }) => ({
  connection: one(pluggyConnections, { fields: [pluggySyncRuns.connectionId], references: [pluggyConnections.id] }),
  user: one(users, { fields: [pluggySyncRuns.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const assetsRelations = relations(assets, ({ many }) => ({
  prices: many(historicalPrices),
  liveQuotes: many(liveQuotes),
  transactions: many(transactions),
  basketAllocations: many(basketAllocations),
  indexFunds: many(investmentFunds),
  pluggyInvestmentMappings: many(pluggyInvestmentMappings),
}));

export const portfoliosRelations = relations(portfolios, ({ one }) => ({
  user: one(users, { fields: [portfolios.userId], references: [users.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  asset: one(assets, { fields: [transactions.assetId], references: [assets.id] }),
}));

export const basketsRelations = relations(baskets, ({ one, many }) => ({
  user: one(users, { fields: [baskets.userId], references: [users.id] }),
  allocations: many(basketAllocations),
}));

export const basketAllocationsRelations = relations(basketAllocations, ({ one }) => ({
  basket: one(baskets, { fields: [basketAllocations.basketId], references: [baskets.id] }),
  asset: one(assets, { fields: [basketAllocations.assetId], references: [assets.id] }),
}));

export const historicalPricesRelations = relations(historicalPrices, ({ one }) => ({
  asset: one(assets, { fields: [historicalPrices.assetId], references: [assets.id] }),
}));

export const liveQuotesRelations = relations(liveQuotes, ({ one }) => ({
  asset: one(assets, { fields: [liveQuotes.assetId], references: [assets.id] }),
}));

export const investmentFundsRelations = relations(investmentFunds, ({ one }) => ({
  user: one(users, { fields: [investmentFunds.userId], references: [users.id] }),
  indexAsset: one(assets, { fields: [investmentFunds.indexAssetId], references: [assets.id] }),
}));

export const tables = {
  users,
  sessions,
  assets,
  historicalPrices,
  liveQuotes,
  portfolios,
  transactions,
  baskets,
  basketAllocations,
  investmentFunds,
  idempotencyRecords,
  portfolioSourcePreferences,
  pluggyConnections,
  pluggyAccounts,
  pluggyInvestments,
  pluggyInvestmentMappings,
  pluggyLoans,
  pluggyTransactions,
  pluggySyncRuns,
  pluggyWebhookEvents,
  userPluggyCredentials,
  accounts,
  verifications,
};

export const nowSql = sql`now()`;
