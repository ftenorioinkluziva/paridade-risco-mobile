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
  phone: text("phone"),
  telegramChatId: text("telegram_chat_id"),
  passwordHash: text("password_hash").notNull(),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("USER"),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex("sessions_token_idx").on(table.token),
  userIdx: index("sessions_user_idx").on(table.userId),
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

export const usersRelations = relations(users, ({ many, one }) => ({
  baskets: many(baskets),
  portfolio: one(portfolios, { fields: [users.id], references: [portfolios.userId] }),
  transactions: many(transactions),
  selectedBasket: one(baskets, { fields: [users.selectedBasketId], references: [baskets.id] }),
  sessions: many(sessions),
  investmentFunds: many(investmentFunds),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const assetsRelations = relations(assets, ({ many }) => ({
  prices: many(historicalPrices),
  transactions: many(transactions),
  basketAllocations: many(basketAllocations),
  indexFunds: many(investmentFunds),
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

export const investmentFundsRelations = relations(investmentFunds, ({ one }) => ({
  user: one(users, { fields: [investmentFunds.userId], references: [users.id] }),
  indexAsset: one(assets, { fields: [investmentFunds.indexAssetId], references: [assets.id] }),
}));

export const tables = {
  users,
  sessions,
  assets,
  historicalPrices,
  portfolios,
  transactions,
  baskets,
  basketAllocations,
  investmentFunds,
  idempotencyRecords,
};

export const nowSql = sql`now()`;
