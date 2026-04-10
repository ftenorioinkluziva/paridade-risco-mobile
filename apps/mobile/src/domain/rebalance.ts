export type RebalanceAction = {
  id: string;
  ticker: string;
  action: "APORTAR" | "REDUZIR";
  amount: number;
  currentPercentage: number;
  targetPercentage: number;
};

export type RebalancePreview = {
  portfolioValue: number;
  driftPercentage: number;
  targetBasketName: string;
  actions: RebalanceAction[];
};
