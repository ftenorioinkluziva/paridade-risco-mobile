export type RebalanceAction = {
  id: string;
  ticker: string;
  action: "APORTAR" | "REDUZIR";
  amount: number;
  currentPrice: number;
  currentPercentage: number;
  targetPercentage: number;
};

export type RebalancePreview = {
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
};
