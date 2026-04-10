import type {
  ActiveBasket,
  AssetOption,
  BasketDetail,
  BasketListItem,
  PortfolioSummary,
  TransactionType,
  TransactionItem,
  UserProfile,
} from "../domain/models";
import type { RebalancePreview } from "../domain/rebalance";

export const mockPortfolioSummary: PortfolioSummary = {
  totalValue: 184320,
  basketDriftPercentage: 8.4,
  unrealizedGain: 12480,
  allocation: [
    { id: "rv", label: "Renda variavel", percentage: 42 },
    { id: "rf", label: "Renda fixa", percentage: 33 },
    { id: "ext", label: "Exterior", percentage: 15 },
    { id: "cash", label: "Caixa", percentage: 10 },
  ],
};

export const mockTransactions: TransactionItem[] = [
  {
    id: "tx-1",
    assetTicker: "IVVB11",
    assetName: "S&P 500 ETF",
    type: "COMPRA",
    amount: 2150,
    dateLabel: "Hoje, 09:12",
  },
  {
    id: "tx-2",
    assetTicker: "B5P211",
    assetName: "Tesouro IPCA",
    type: "COMPRA",
    amount: 1000,
    dateLabel: "Ontem, 18:40",
  },
  {
    id: "tx-3",
    assetTicker: "HASH11",
    assetName: "Cripto ETF",
    type: "VENDA",
    amount: 860,
    dateLabel: "12 Mar",
  },
];

export const mockAssetOptions: AssetOption[] = [
  { id: "asset-1", ticker: "IVVB11", name: "S&P 500 ETF" },
  { id: "asset-2", ticker: "B5P211", name: "Tesouro IPCA" },
  { id: "asset-3", ticker: "HASH11", name: "Cripto ETF" },
  { id: "asset-4", ticker: "GOLD11", name: "Ouro ETF" },
];

export const mockActiveBasket: ActiveBasket = {
  id: "basket-1",
  name: "Risk Parity Brasil",
  description:
    "A cesta ativa serve como referencia para o rebalanceamento e para a leitura de desvio da carteira.",
};

export const mockBaskets: BasketListItem[] = [
  {
    id: "basket-1",
    name: "Risk Parity Brasil",
    assetCount: 4,
    status: "ATIVA",
  },
  {
    id: "basket-2",
    name: "Defensiva",
    assetCount: 5,
    status: "RASCUNHO",
  },
];

export const mockBasketDetails: Record<string, BasketDetail> = {
  "basket-1": {
    id: "basket-1",
    name: "Risk Parity Brasil",
    status: "ATIVA",
    description: "Cesta principal usada para rebalanceamento tatico e leitura de desvio.",
    allocations: [
      { id: "ba-1", ticker: "IVVB11", name: "S&P 500 ETF", targetPercentage: 22 },
      { id: "ba-2", ticker: "B5P211", name: "Tesouro IPCA", targetPercentage: 15 },
      { id: "ba-3", ticker: "GOLD11", name: "Ouro ETF", targetPercentage: 6 },
      { id: "ba-4", ticker: "HASH11", name: "Cripto ETF", targetPercentage: 7 },
    ],
  },
  "basket-2": {
    id: "basket-2",
    name: "Defensiva",
    status: "RASCUNHO",
    description: "Estrutura de preservacao com menor volatilidade e foco em protecao.",
    allocations: [
      { id: "ba-5", ticker: "B5P211", name: "Tesouro IPCA", targetPercentage: 30 },
      { id: "ba-6", ticker: "IVVB11", name: "S&P 500 ETF", targetPercentage: 20 },
      { id: "ba-7", ticker: "GOLD11", name: "Ouro ETF", targetPercentage: 10 },
      { id: "ba-8", ticker: "HASH11", name: "Cripto ETF", targetPercentage: 5 },
      { id: "ba-9", ticker: "CASH", name: "Caixa", targetPercentage: 35 },
    ],
  },
};

export const mockUserProfile: UserProfile = {
  id: "user-1",
  name: "Felipe Tenorio",
  email: "felipe@paridaderisco.com",
  initials: "FT",
  roleLabel: "Investidor",
  activeBasketName: "Risk Parity Brasil",
};

export const transactionTypeOptions: TransactionType[] = ["COMPRA", "VENDA"];

export const mockRebalancePreview: RebalancePreview = {
  portfolioValue: 184320,
  driftPercentage: 8.4,
  targetBasketName: "Risk Parity Brasil",
  actions: [
    {
      id: "rb-1",
      ticker: "B5P211",
      action: "APORTAR",
      amount: 3200,
      currentPercentage: 11,
      targetPercentage: 15,
    },
    {
      id: "rb-2",
      ticker: "IVVB11",
      action: "REDUZIR",
      amount: 1850,
      currentPercentage: 26,
      targetPercentage: 22,
    },
    {
      id: "rb-3",
      ticker: "GOLD11",
      action: "APORTAR",
      amount: 980,
      currentPercentage: 4,
      targetPercentage: 6,
    },
  ],
};
