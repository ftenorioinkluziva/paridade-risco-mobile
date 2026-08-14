import { and, desc, eq, lt, lte, or, sql } from "drizzle-orm";
import { db } from "../../db/client";
import {
  pluggyAccounts,
  pluggyConnections,
  pluggyInvestments,
  pluggyLoans,
  pluggySyncRuns,
  pluggyTransactions,
  pluggyWebhookEvents,
} from "../../db/schema";
import type { PluggyResource } from "./client";
import { normalizePluggyLoan } from "./loan-normalizer";

export type PluggyDatabase = typeof db;

export const resourceString = (resource: PluggyResource, ...keys: string[]): string | null => {
  for (const key of keys) {
    const value = resource[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
};

export const resourceNumber = (resource: PluggyResource, ...keys: string[]): string | null => {
  const value = resourceString(resource, ...keys);
  if (value === null || !Number.isFinite(Number(value))) return null;
  return value;
};

export const resourceDate = (resource: PluggyResource, ...keys: string[]): Date | null => {
  const value = resourceString(resource, ...keys);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const nestedResource = (resource: PluggyResource, key: string): PluggyResource => {
  const value = resource[key];
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as PluggyResource : {};
};

export async function upsertConnection(database: PluggyDatabase, input: {
  userId: string;
  itemId: string;
  environment: string;
  item: PluggyResource;
}) {
  const connector = nestedResource(input.item, "connector");
  const values = {
    userId: input.userId,
    itemId: input.itemId,
    environment: input.environment,
    connectorId: resourceString(connector, "id"),
    connectorName: resourceString(connector, "name") ?? resourceString(input.item, "connectorName"),
    status: resourceString(input.item, "status") ?? "UNKNOWN",
    consentExpiresAt: resourceDate(input.item, "consentExpiresAt", "consentExpirationDate"),
    updatedAt: new Date(),
  };

  const [connection] = await database.insert(pluggyConnections).values(values).onConflictDoUpdate({
    target: pluggyConnections.itemId,
    set: values,
  }).returning({ id: pluggyConnections.id });
  return connection.id;
}

export async function upsertAccount(database: PluggyDatabase, input: {
  connectionId: string;
  userId: string;
  source: PluggyResource;
  observedAt: Date;
}) {
  const creditData = nestedResource(input.source, "creditData");
  const sourceAccountId = resourceString(input.source, "id");
  if (!sourceAccountId) throw new Error("Pluggy account is missing id");

  const values = {
    connectionId: input.connectionId,
    userId: input.userId,
    sourceAccountId,
    type: resourceString(input.source, "type"),
    subtype: resourceString(input.source, "subtype"),
    name: resourceString(input.source, "name") ?? "Conta Pluggy",
    balance: resourceNumber(input.source, "balance"),
    availableBalance: resourceNumber(input.source, "availableBalance"),
    creditLimit: resourceNumber(creditData, "creditLimit"),
    availableCreditLimit: resourceNumber(creditData, "availableCreditLimit"),
    balanceDueDate: resourceDate(creditData, "balanceDueDate"),
    balanceCloseDate: resourceDate(creditData, "balanceCloseDate"),
    minimumPayment: resourceNumber(creditData, "minimumPayment"),
    currencyCode: resourceString(input.source, "currencyCode", "currency"),
    status: resourceString(input.source, "status"),
    rawData: input.source,
    observedAt: input.observedAt,
    updatedAt: new Date(),
  };

  const [account] = await database.insert(pluggyAccounts).values(values).onConflictDoUpdate({
    target: [pluggyAccounts.connectionId, pluggyAccounts.sourceAccountId],
    set: values,
  }).returning({ id: pluggyAccounts.id });
  return account.id;
}

export async function upsertInvestment(database: PluggyDatabase, input: {
  connectionId: string;
  userId: string;
  source: PluggyResource;
  observedAt: Date;
}) {
  const sourceInvestmentId = resourceString(input.source, "id");
  if (!sourceInvestmentId) throw new Error("Pluggy investment is missing id");

  const values = {
    connectionId: input.connectionId,
    userId: input.userId,
    sourceInvestmentId,
    providerId: resourceString(input.source, "providerId"),
    code: resourceString(input.source, "code"),
    isin: resourceString(input.source, "isin"),
    investmentNumber: resourceString(input.source, "number", "investmentNumber"),
    name: resourceString(input.source, "name") ?? "Investimento Pluggy",
    type: resourceString(input.source, "type"),
    subtype: resourceString(input.source, "subtype"),
    quantity: resourceNumber(input.source, "quantity"),
    balance: resourceNumber(input.source, "balance", "currentValue"),
    amountOriginal: resourceNumber(input.source, "amountOriginal"),
    amountProfit: resourceNumber(input.source, "amountProfit"),
    amountWithdrawal: resourceNumber(input.source, "amountWithdrawal"),
    currencyCode: resourceString(input.source, "currencyCode"),
    issuer: resourceString(input.source, "issuer"),
    status: resourceString(input.source, "status"),
    rawData: input.source,
    observedAt: input.observedAt,
    updatedAt: new Date(),
  };

  const [investment] = await database.insert(pluggyInvestments).values(values).onConflictDoUpdate({
    target: [pluggyInvestments.connectionId, pluggyInvestments.sourceInvestmentId],
    set: values,
  }).returning({ id: pluggyInvestments.id });
  return investment.id;
}

export async function upsertLoan(database: PluggyDatabase, input: {
  connectionId: string;
  userId: string;
  source: PluggyResource;
  observedAt: Date;
}) {
  const normalized = normalizePluggyLoan(input.source);

  const values = {
    connectionId: input.connectionId,
    userId: input.userId,
    ...normalized,
    rawData: input.source,
    observedAt: input.observedAt,
    updatedAt: new Date(),
  };

  const [loan] = await database.insert(pluggyLoans).values(values).onConflictDoUpdate({
    target: [pluggyLoans.connectionId, pluggyLoans.sourceLoanId],
    set: values,
  }).returning({ id: pluggyLoans.id });
  return loan.id;
}

export async function upsertTransaction(database: PluggyDatabase, input: {
  connectionId: string;
  accountId: string;
  userId: string;
  sourceAccountId: string;
  source: PluggyResource;
  observedAt: Date;
}) {
  const sourceTransactionId = resourceString(input.source, "id");
  if (!sourceTransactionId) throw new Error("Pluggy transaction is missing id");

  const creditCardMetadata = nestedResource(input.source, "creditCardMetadata");
  const values = {
    connectionId: input.connectionId,
    accountId: input.accountId,
    userId: input.userId,
    sourceTransactionId,
    sourceAccountId: input.sourceAccountId,
    transactionDate: resourceDate(input.source, "date", "transactionDate"),
    description: resourceString(input.source, "description"),
    amount: resourceNumber(input.source, "amount"),
    type: resourceString(input.source, "type"),
    status: resourceString(input.source, "status"),
    category: resourceString(input.source, "category"),
    merchantName: resourceString(input.source, "merchantName", "payeeName"),
    installmentNumber: resourceNumber(creditCardMetadata, "installmentNumber") ? Number(resourceNumber(creditCardMetadata, "installmentNumber")) : null,
    totalInstallments: resourceNumber(creditCardMetadata, "totalInstallments") ? Number(resourceNumber(creditCardMetadata, "totalInstallments")) : null,
    totalAmount: resourceNumber(creditCardMetadata, "totalAmount"),
    billId: resourceString(creditCardMetadata, "billId"),
    purchaseDate: resourceDate(creditCardMetadata, "purchaseDate"),
    rawData: input.source,
    observedAt: input.observedAt,
    updatedAt: new Date(),
  };

  const [transaction] = await database.insert(pluggyTransactions).values(values).onConflictDoUpdate({
    target: [pluggyTransactions.connectionId, pluggyTransactions.sourceTransactionId],
    set: values,
  }).returning({ id: pluggyTransactions.id });
  return transaction.id;
}

export async function createSyncRun(database: PluggyDatabase, input: { connectionId: string; userId: string; startedAt: Date }) {
  const [run] = await database.insert(pluggySyncRuns).values({
    connectionId: input.connectionId,
    userId: input.userId,
    status: "RUNNING",
    startedAt: input.startedAt,
  }).returning({ id: pluggySyncRuns.id });
  return run.id;
}

export async function findRunningSync(database: PluggyDatabase, userId: string) {
  return database.query.pluggySyncRuns.findFirst({
    where: and(eq(pluggySyncRuns.userId, userId), eq(pluggySyncRuns.status, "RUNNING")),
    orderBy: [desc(pluggySyncRuns.startedAt)],
    columns: { id: true, startedAt: true },
  });
}

export async function finishSyncRun(database: PluggyDatabase, input: { id: string; status: string; finishedAt: Date; counts?: unknown; error?: string }) {
  await database.update(pluggySyncRuns).set({
    status: input.status,
    finishedAt: input.finishedAt,
    counts: input.counts,
    error: input.error,
  }).where(eq(pluggySyncRuns.id, input.id));
}

export async function updateConnectionSync(database: PluggyDatabase, input: { id: string; status: string; syncedAt: Date; error?: string }) {
  await database.update(pluggyConnections).set({
    lastSyncAt: input.syncedAt,
    lastSyncStatus: input.status,
    lastError: input.error,
    updatedAt: input.syncedAt,
  }).where(eq(pluggyConnections.id, input.id));
}

export async function findConnection(database: PluggyDatabase, userId: string, itemId: string) {
  const [connection] = await database.select().from(pluggyConnections).where(and(eq(pluggyConnections.userId, userId), eq(pluggyConnections.itemId, itemId))).limit(1);
  return connection ?? null;
}

export async function findConnectionByItemId(database: PluggyDatabase, itemId: string) {
  const [connection] = await database.select({
    id: pluggyConnections.id,
    userId: pluggyConnections.userId,
    status: pluggyConnections.status,
  }).from(pluggyConnections).where(eq(pluggyConnections.itemId, itemId)).limit(1);
  return connection ?? null;
}

export async function recordPluggyWebhookEvent(database: PluggyDatabase, input: {
  eventId: string;
  event: string;
  itemId: string | null;
  accountId: string | null;
  payload: unknown;
}) {
  const [created] = await database.insert(pluggyWebhookEvents).values({
    eventId: input.eventId,
    event: input.event,
    itemId: input.itemId,
    accountId: input.accountId,
    payload: input.payload,
  }).onConflictDoNothing({ target: pluggyWebhookEvents.eventId }).returning({ id: pluggyWebhookEvents.id });

  if (created) return { id: created.id, duplicate: false };

  const existing = await database.query.pluggyWebhookEvents.findFirst({
    where: eq(pluggyWebhookEvents.eventId, input.eventId),
    columns: { id: true },
  });
  if (!existing) throw new Error("Pluggy webhook event was not available after duplicate insert");
  return { id: existing.id, duplicate: true };
}

export async function claimNextPluggyWebhookEvent(database: PluggyDatabase, input: { now: Date; maxAttempts: number }) {
  const availableStatus = or(
    eq(pluggyWebhookEvents.status, "RECEIVED"),
    eq(pluggyWebhookEvents.status, "FAILED"),
  );
  const candidate = await database.query.pluggyWebhookEvents.findFirst({
    where: and(
      availableStatus,
      lte(pluggyWebhookEvents.nextAttemptAt, input.now),
      lt(pluggyWebhookEvents.attempts, input.maxAttempts),
    ),
    orderBy: [pluggyWebhookEvents.receivedAt],
  });
  if (!candidate) return null;

  const [claimed] = await database.update(pluggyWebhookEvents).set({
    status: "PROCESSING",
    attempts: sql`${pluggyWebhookEvents.attempts} + 1`,
    updatedAt: input.now,
  }).where(and(
    eq(pluggyWebhookEvents.id, candidate.id),
    availableStatus,
    lte(pluggyWebhookEvents.nextAttemptAt, input.now),
    lt(pluggyWebhookEvents.attempts, input.maxAttempts),
  )).returning();
  return claimed ?? null;
}

export async function setPluggyWebhookEventUser(database: PluggyDatabase, input: { id: string; userId: string }) {
  await database.update(pluggyWebhookEvents).set({ userId: input.userId, updatedAt: new Date() }).where(eq(pluggyWebhookEvents.id, input.id));
}

export async function finishPluggyWebhookEvent(database: PluggyDatabase, input: {
  id: string;
  status: "SUCCEEDED" | "FAILED" | "IGNORED";
  processedAt: Date;
  nextAttemptAt?: Date | null;
  lastError?: string | null;
}) {
  await database.update(pluggyWebhookEvents).set({
    status: input.status,
    processedAt: input.processedAt,
    nextAttemptAt: input.nextAttemptAt ?? null,
    lastError: input.lastError ?? null,
    updatedAt: input.processedAt,
  }).where(eq(pluggyWebhookEvents.id, input.id));
}

export async function updateConnectionWebhookStatus(database: PluggyDatabase, input: { id: string; status: string; error?: string | null }) {
  await database.update(pluggyConnections).set({
    status: input.status,
    lastError: input.error ?? null,
    updatedAt: new Date(),
  }).where(eq(pluggyConnections.id, input.id));
}

export async function listPluggyWebhookEvents(database: PluggyDatabase, userId: string, limit = 50) {
  return database.select({
    id: pluggyWebhookEvents.id,
    eventId: pluggyWebhookEvents.eventId,
    event: pluggyWebhookEvents.event,
    itemId: pluggyWebhookEvents.itemId,
    status: pluggyWebhookEvents.status,
    attempts: pluggyWebhookEvents.attempts,
    receivedAt: pluggyWebhookEvents.receivedAt,
    processedAt: pluggyWebhookEvents.processedAt,
    lastError: pluggyWebhookEvents.lastError,
  }).from(pluggyWebhookEvents)
    .where(eq(pluggyWebhookEvents.userId, userId))
    .orderBy(desc(pluggyWebhookEvents.receivedAt))
    .limit(Math.min(100, Math.max(1, limit)));
}

export async function retryPluggyWebhookEvent(database: PluggyDatabase, input: { id: string; userId: string }) {
  const [event] = await database.update(pluggyWebhookEvents).set({
    status: "RECEIVED",
    attempts: 0,
    nextAttemptAt: new Date(),
    processedAt: null,
    lastError: null,
    updatedAt: new Date(),
  }).where(and(
    eq(pluggyWebhookEvents.id, input.id),
    eq(pluggyWebhookEvents.userId, input.userId),
    or(eq(pluggyWebhookEvents.status, "FAILED"), eq(pluggyWebhookEvents.status, "IGNORED")),
  )).returning({ id: pluggyWebhookEvents.id });
  return event ?? null;
}
