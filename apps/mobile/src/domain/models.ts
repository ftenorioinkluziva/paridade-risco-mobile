export type TransactionType = "COMPRA" | "VENDA";

export type AllocationSlice = {
  id: string;
  label: string;
  percentage: number;
};

export type PortfolioSummary = {
  totalValue: number;
  basketDriftPercentage: number;
  unrealizedGain: number;
  allocation: AllocationSlice[];
};

export type TransactionItem = {
  id: string;
  assetTicker: string;
  assetName: string;
  type: TransactionType;
  amount: number;
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
  initials: string;
  roleLabel: string;
  activeBasketName: string;
};
