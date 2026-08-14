import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  assets,
  pluggyAccounts,
  pluggyConnections,
  pluggyInvestmentMappings,
  pluggyInvestments,
  pluggySyncRuns,
} from "@/db/schema";
import { toNumber } from "@/lib/number";
import {
  classifyPluggyInvestment,
  findMappingCandidate,
  isPluggyCreditCard,
  resolvePluggyMappingStatus,
  type PluggyInvestmentClassification,
} from "./projection-rules";
import { buildPluggyFreshness, type PluggyFreshnessStatus } from "./freshness-rules";

import type { AssetType } from "@paridade-risco/shared";

export { classifyPluggyInvestment, findMappingCandidate, isPluggyCreditCard, resolvePluggyMappingStatus } from "./projection-rules";
export type { PluggyInvestmentClassification, PluggyMappingStatus } from "./projection-rules";

export interface PluggyInvestmentProjection {
  id: string;
  connectionId: string;
  itemId: string;
  sourceInvestmentId: string;
  providerId: string | null;
  code: string | null;
  isin: string | null;
  name: string;
  type: string | null;
  subtype: string | null;
  issuer: string | null;
  quantity: number | null;
  currentValue: number;
  originalValue: number | null;
  profitValue: number | null;
  costBasisAvailable: boolean;
  observedAt: string;
  mappingId: string | null;
  decisionReason: string | null;
  classification: PluggyInvestmentClassification;
  mappingCandidate: {
    assetId: string;
    ticker: string;
    name: string;
    type: AssetType;
  } | null;
}

export interface PluggyProjection {
  generatedAt: string;
  freshness: {
    status: PluggyFreshnessStatus;
    latestObservedAt: string | null;
    latestSyncAt: string | null;
    latestSyncStatus: string | null;
    ageMinutes: number | null;
    staleAfterMinutes: number;
  };
  connections: Array<{
    id: string;
    itemId: string;
    environment: string;
    connectorName: string | null;
    status: string;
    consentExpiresAt: string | null;
    lastSyncStatus: string | null;
    lastSyncAt: string | null;
    lastError: string | null;
  }>;
  accounts: Array<{
    id: string;
    connectionId: string;
    itemId: string;
    sourceAccountId: string;
    name: string;
    type: string | null;
    subtype: string | null;
    balance: number | null;
    availableBalance: number | null;
    creditLimit: number | null;
    availableCreditLimit: number | null;
    minimumPayment: number | null;
    balanceDueDate: string | null;
    isCreditCard: boolean;
    observedAt: string;
  }>;
  investments: PluggyInvestmentProjection[];
  totals: {
    totalInvestedValue: number;
    totalOriginalValue: number | null;
    totalProfitValue: number | null;
    byRiskBucket: Record<AssetType, number>;
    mappedCount: number;
    suggestedCount: number;
    pendingCount: number;
    outsideStrategyCount: number;
    missingCostBasisCount: number;
  };
}

function iso(date: Date | null) {
  return date?.toISOString() ?? null;
}

function numericOrNull(value: string | null) {
  return value === null ? null : toNumber(value);
}

export async function getPluggyProjection(userId: string): Promise<PluggyProjection> {
  const [connectionRows, accountRows, investmentRows, mappingRows, localAssets, latestSync] = await Promise.all([
    db.query.pluggyConnections.findMany({
      where: eq(pluggyConnections.userId, userId),
      orderBy: [desc(pluggyConnections.updatedAt)],
    }),
    db.query.pluggyAccounts.findMany({
      where: eq(pluggyAccounts.userId, userId),
      orderBy: [desc(pluggyAccounts.observedAt)],
    }),
    db.query.pluggyInvestments.findMany({
      where: eq(pluggyInvestments.userId, userId),
      orderBy: [desc(pluggyInvestments.observedAt)],
    }),
    db.query.pluggyInvestmentMappings.findMany({
      where: eq(pluggyInvestmentMappings.userId, userId),
    }),
    db.query.assets.findMany({
      where: eq(assets.isActive, true),
      columns: { id: true, ticker: true, sourceTicker: true, name: true, type: true },
    }),
    db.query.pluggySyncRuns.findFirst({
      where: eq(pluggySyncRuns.userId, userId),
      orderBy: [desc(pluggySyncRuns.finishedAt)],
      columns: { finishedAt: true, status: true },
    }),
  ]);

  const connectionById = new Map(connectionRows.map((connection) => [connection.id, connection]));
  const mappingByInvestmentId = new Map(mappingRows.map((mapping) => [mapping.pluggyInvestmentId, mapping]));
  const byRiskBucket = Object.fromEntries(["ETF", "RENDA_FIXA", "CRYPTO", "COMMODITY", "CAIXA", "OUTRO"].map((bucket) => [bucket, 0])) as Record<AssetType, number>;
  let totalInvestedValue = 0;
  let originalValueSum = 0;
  let profitValueSum = 0;
  let hasOriginalValue = false;
  let hasProfitValue = false;
  let mappedCount = 0;
  let suggestedCount = 0;
  let pendingCount = 0;
  let outsideStrategyCount = 0;
  let missingCostBasisCount = 0;

  const investments = investmentRows.map((investment) => {
    const connection = connectionById.get(investment.connectionId);
    const persistedMapping = mappingByInvestmentId.get(investment.id);
    const suggestedAsset = findMappingCandidate(investment, localAssets);
    const isOutsideStrategy = persistedMapping?.status === "FORA_DA_ESTRATEGIA";
    const mappedAsset = persistedMapping?.assetId
      ? localAssets.find((asset) => asset.id === persistedMapping.assetId) ?? null
      : null;
    const baseClassification = classifyPluggyInvestment({
      code: investment.code,
      name: investment.name,
      type: investment.type,
      subtype: investment.subtype,
      issuer: investment.issuer,
      hasMappingCandidate: Boolean(suggestedAsset),
    });
    const mappingStatus = resolvePluggyMappingStatus({
      hasPersistedMapping: Boolean(persistedMapping),
      hasMappingCandidate: Boolean(suggestedAsset),
      persistedStatus: isOutsideStrategy ? "FORA_DA_ESTRATEGIA" : undefined,
    });
    const classification: PluggyInvestmentClassification = {
      ...baseClassification,
      mappingStatus,
      ...(persistedMapping
        ? { reason: isOutsideStrategy
          ? persistedMapping.decisionReason ?? "Investimento mantido fora da estratégia atual"
          : "Vínculo estratégico aprovado pelo usuário" }
        : {}),
    };
    const mappingCandidate = isOutsideStrategy ? null : mappedAsset ?? suggestedAsset;
    const currentValue = numericOrNull(investment.balance) ?? 0;
    const originalValue = numericOrNull(investment.amountOriginal);
    const profitValue = numericOrNull(investment.amountProfit);

    totalInvestedValue += currentValue;
    byRiskBucket[classification.riskBucket] += currentValue;
    if (originalValue !== null) {
      hasOriginalValue = true;
      originalValueSum += originalValue;
    }
    if (profitValue !== null) {
      hasProfitValue = true;
      profitValueSum += profitValue;
    }
    if (originalValue === null) missingCostBasisCount += 1;
    if (classification.mappingStatus === "MAPEADO") mappedCount += 1;
    if (classification.mappingStatus === "SUGERIDO") suggestedCount += 1;
    if (classification.mappingStatus === "PENDENTE") pendingCount += 1;
    if (classification.mappingStatus === "FORA_DA_ESTRATEGIA") outsideStrategyCount += 1;

    return {
      id: investment.id,
      connectionId: investment.connectionId,
      itemId: connection?.itemId ?? "",
      sourceInvestmentId: investment.sourceInvestmentId,
      providerId: investment.providerId,
      code: investment.code,
      isin: investment.isin,
      name: investment.name,
      type: investment.type,
      subtype: investment.subtype,
      issuer: investment.issuer,
      quantity: numericOrNull(investment.quantity),
      currentValue,
      originalValue,
      profitValue,
      costBasisAvailable: originalValue !== null,
      observedAt: investment.observedAt.toISOString(),
      mappingId: persistedMapping?.id ?? null,
      decisionReason: persistedMapping?.decisionReason ?? null,
      classification,
      mappingCandidate: mappingCandidate ? {
        assetId: mappingCandidate.id,
        ticker: mappingCandidate.ticker,
        name: mappingCandidate.name,
        type: mappingCandidate.type,
      } : null,
    } satisfies PluggyInvestmentProjection;
  });

  const latestObservedAt = investmentRows.reduce<Date | null>((latest, investment) => {
    if (!latest || investment.observedAt > latest) return investment.observedAt;
    return latest;
  }, null);
  const freshness = buildPluggyFreshness({
    latestObservedAt,
    latestSyncAt: latestSync?.finishedAt ?? null,
    latestSyncStatus: latestSync?.status ?? null,
  });

  return {
    generatedAt: new Date().toISOString(),
    freshness,
    connections: connectionRows.map((connection) => ({
      id: connection.id,
      itemId: connection.itemId,
      environment: connection.environment,
      connectorName: connection.connectorName,
      status: connection.status,
      consentExpiresAt: iso(connection.consentExpiresAt),
      lastSyncStatus: connection.lastSyncStatus,
      lastSyncAt: iso(connection.lastSyncAt),
      lastError: connection.lastError,
    })),
    accounts: accountRows.map((account) => {
      const connection = connectionById.get(account.connectionId);
      return {
        id: account.id,
        connectionId: account.connectionId,
        itemId: connection?.itemId ?? "",
        sourceAccountId: account.sourceAccountId,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        balance: numericOrNull(account.balance),
        availableBalance: numericOrNull(account.availableBalance),
        creditLimit: numericOrNull(account.creditLimit),
        availableCreditLimit: numericOrNull(account.availableCreditLimit),
        minimumPayment: numericOrNull(account.minimumPayment),
        balanceDueDate: iso(account.balanceDueDate),
        isCreditCard: isPluggyCreditCard(account.type, account.subtype),
        observedAt: account.observedAt.toISOString(),
      };
    }),
    investments,
    totals: {
      totalInvestedValue,
      totalOriginalValue: hasOriginalValue ? originalValueSum : null,
      totalProfitValue: hasProfitValue ? profitValueSum : null,
      byRiskBucket,
      mappedCount,
      suggestedCount,
      pendingCount,
      outsideStrategyCount,
      missingCostBasisCount,
    },
  };
}
