import type { AssetType } from "@paridade-risco/shared";

export type PortfolioProviderSource = "MANUAL" | "PLUGGY" | "DUAL_READ";

export interface PortfolioProviderPosition {
  providerPositionId: string;
  assetId: string;
  ticker: string;
  name: string;
  type: AssetType;
  quantity: number | null;
  currentValue: number;
  costBasis: number | null;
  observedAt: Date | null;
}

export interface PortfolioProviderSnapshot {
  source: PortfolioProviderSource;
  observedAt: Date | null;
  totalValue: number;
  investedValue: number;
  cashBalance: number;
  outsideStrategyValue: number;
  outsideStrategyCount: number;
  unresolvedValue: number;
  unresolvedCount: number;
  positions: PortfolioProviderPosition[];
  livePricesByTicker?: Record<string, number>;
  warnings: string[];
  freshness?: { status: "FRESH" | "STALE" | "UNAVAILABLE"; latestObservedAt: string | null; latestSyncAt: string | null; ageMinutes: number | null };
}

/**
 * Stable boundary for the future portfolio source switch.
 * Story 3.7 implements the Pluggy provider; the existing manual provider remains active.
 */
export interface PortfolioProvider {
  readonly source: PortfolioProviderSource;
  getSnapshot(userId: string): Promise<PortfolioProviderSnapshot>;
}
