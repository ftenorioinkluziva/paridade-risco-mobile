import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
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

export const transactionTypeEnum = pgEnum("transaction_type", ["COMPRA", "VENDA"]);

export const basketStatusEnum = pgEnum("basket_status", ["ATIVA", "RASCUNHO"]);

export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
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
  name: text("name").notNull(),
  type: assetTypeEnum("type").notNull(),
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

export const usersRelations = relations(users, ({ many, one }) => ({
  baskets: many(baskets),
  portfolio: one(portfolios, { fields: [users.id], references: [portfolios.userId] }),
  transactions: many(transactions),
  selectedBasket: one(baskets, { fields: [users.selectedBasketId], references: [baskets.id] }),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const assetsRelations = relations(assets, ({ many }) => ({
  prices: many(historicalPrices),
  transactions: many(transactions),
  basketAllocations: many(basketAllocations),
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

export const tables = {
  users,
  sessions,
  assets,
  historicalPrices,
  portfolios,
  transactions,
  baskets,
  basketAllocations,
};

export const nowSql = sql`now()`;
