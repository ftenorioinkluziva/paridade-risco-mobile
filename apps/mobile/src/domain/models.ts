export type TransactionType = "COMPRA" | "VENDA";

export type AllocationSlice = {
  id: string;
  ticker: string;
  label: string;
  percentage: number;
  targetPercentage: number;
};

export type FundSnapshot = {
  id: string;
  name: string;
  indexTicker?: string;
  initialInvestment: number;
  currentValue: number;
  gain: number;
  gainPercentage: number;
  investmentDate: string;
};

export type PortfolioSummary = {
  totalValue: number;
  positionsValue: number;
  fundsValue: number;
  cashBalance: number;
  positionCount: number;
  basketDriftPercentage: number;
  unrealizedGain: number;
  allocation: AllocationSlice[];
  positions: PositionSnapshot[];
  funds: FundSnapshot[];
};

export type PositionSnapshot = {
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
};

export type TransactionItem = {
  id: string;
  assetTicker: string;
  assetName: string;
  type: TransactionType;
  shares: number;
  pricePerShare: number;
  amount: number;
  tradedAt: string;
  dateLabel: string;
};

export type BasketListItem = {
  id: string;
  name: string;
  assetCount: number;
  status: "ATIVA" | "RASCUNHO";
};

export type BasketAllocationItem = {
  id: string;
  ticker: string;
  name: string;
  targetPercentage: number;
};

export type BasketDetail = {
  id: string;
  name: string;
  status: "ATIVA" | "RASCUNHO";
  description: string;
  allocations: BasketAllocationItem[];
};

export type AssetOption = {
  id: string;
  ticker: string;
  name: string;
};

export type ActiveBasket = {
  id: string;
  name: string;
  description: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  role: "ADMIN" | "USER";
  birthDate: string | null;
  initials: string;
  roleLabel: string;
  activeBasketName: string;
};

export type InvestmentFund = {
  id: string;
  name: string;
  initialInvestment: number;
  currentValue: number;
  investmentDate: string;
  updatedAt: string;
  indexAssetTicker: string | null;
  indexAssetName: string | null;
};
