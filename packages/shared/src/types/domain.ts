// Domain types for Paridade de Risco — shared across api, mobile, cli, mcp

export type TransactionType = "COMPRA" | "VENDA";
export type BasketStatus = "ATIVA" | "RASCUNHO";
export type AssetType = "ETF" | "RENDA_FIXA" | "CRYPTO" | "COMMODITY" | "CAIXA" | "OUTRO";
export type UserRole = "ADMIN" | "USER";
export type AssetCalculationType = "PRECO" | "PERCENTUAL";

// --- Assets ---

export interface PriceDataPoint {
  date: Date;
  price: string;
}

export type PriceSource = "YAHOO_FINANCE" | "BCB";

export interface AssetPriceUpdateResult {
  ticker: string;
  source: PriceSource | null;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  lastDateBefore: Date | null;
  lastDateAfter: Date | null;
  success: boolean;
  message?: string;
}

export interface AssetPriceStatus {
  ticker: string;
  lastUpdate: Date | null;
  staleDays: number;
}

// --- Portfolio / Position types for business logic ---

export interface RawPosition {
  assetId: string;
  ticker: string;
  name: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  currentValue: number;
  dailyChangePercentage: number | null;
  allocationPercentage: number;
}

export interface PortfolioSnapshot {
  totalValue: number;
  unrealizedGain: number;
  cashBalance: number;
  fundsValue: number;
  positionsValue: number;
  positions: RawPosition[];
}

// --- Baskets ---

export interface BasketAllocation {
  targetPercentage: number;
  asset: {
    ticker: string;
    name: string;
  };
}

export interface ActiveBasket {
  id: string;
  name: string;
  allocations: BasketAllocation[];
}

// --- Rebalance ---

export interface RebalanceAction {
  id: string;
  ticker: string;
  action: "APORTAR" | "REDUZIR";
  amount: number;
  currentPrice: number;
  estimatedQuantity: number | null;
  currentPercentage: number;
  targetPercentage: number;
}

export interface RebalancePreview {
  portfolioValue: number;
  driftPercentage: number;
  targetBasketName: string;
  actions: RebalanceAction[];
}

export interface RebalanceEligibility {
  eligibleForRebalance: boolean;
  missingProfileFields: string[];
}

// --- BCB helpers ---

export interface BCBDataPoint {
  valor: string;
  data: string;
}

// --- API response shapes (for CLI/MCP output) ---

export interface AllocationSlice {
  id: string;
  ticker: string;
  label: string;
  percentage: number;
  targetPercentage: number;
}

export interface FundSnapshot {
  id: string;
  name: string;
  indexTicker?: string;
  initialInvestment: number;
  currentValue: number;
  gain: number;
  gainPercentage: number;
  investmentDate: string;
}

export interface PositionDetail {
  id: string;
  ticker: string;
  name: string;
  shares: number;
  averagePrice: number;
  currentPrice: number;
  currentValue: number;
  gain: number;
  gainPercentage: number;
  dailyChangePercentage: number | null;
}

export interface PortfolioSummary {
  totalValue: number;
  positionsValue: number;
  fundsValue: number;
  cashBalance: number;
  positionCount: number;
  basketDriftPercentage: number;
  unrealizedGain: number;
  allocation: AllocationSlice[];
  positions: PositionDetail[];
  funds: FundSnapshot[];
}

export interface RebalanceFullPreview {
  portfolioValue: number;
  investedValue: number;
  cashAvailable: number;
  calculationBaseValue: number;
  rebalanceCost: number;
  postRebalanceCash: number;
  includeCash: boolean;
  driftPercentage: number;
  targetBasketName: string;
  actions: RebalanceAction[];
  eligibleForRebalance: boolean;
  missingProfileFields: string[];
}
