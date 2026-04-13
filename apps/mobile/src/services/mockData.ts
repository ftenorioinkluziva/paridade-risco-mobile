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
  positionsValue: 165888,
  fundsValue: 13824,
  cashBalance: 4608,
  positionCount: 4,
  basketDriftPercentage: 8.4,
  unrealizedGain: 12480,
  allocation: [
    { id: "rv", ticker: "BOVA11", label: "Renda variavel", percentage: 42, targetPercentage: 40 },
    { id: "rf", ticker: "B5P211", label: "Renda fixa", percentage: 33, targetPercentage: 35 },
    { id: "ext", ticker: "IVVB11", label: "Exterior", percentage: 15, targetPercentage: 15 },
    { id: "cash", ticker: "CASH", label: "Caixa", percentage: 10, targetPercentage: 10 },
  ],
  positions: [
    {
      id: "asset-1",
      ticker: "IVVB11",
      name: "S&P 500 ETF",
      shares: 24,
      averagePrice: 280,
      currentPrice: 320,
      currentValue: 7680,
      gain: 960,
      gainPercentage: 14.29,
    },
    {
      id: "asset-2",
      ticker: "B5P211",
      name: "Tesouro IPCA",
      shares: 100,
      averagePrice: 100,
      currentPrice: 105,
      currentValue: 10500,
      gain: 500,
      gainPercentage: 5,
    },
  ],
  funds: [
    {
      id: "fund-1",
      name: "Fundo CDI",
      indexTicker: "CDI",
      initialInvestment: 10000,
      currentValue: 10708,
      gain: 708,
      gainPercentage: 7.08,
      investmentDate: "2025-01-15T00:00:00.000Z",
    },
  ],
};

export const mockTransactions: TransactionItem[] = [
  {
    id: "tx-1",
    assetTicker: "IVVB11",
    assetName: "S&P 500 ETF",
    type: "COMPRA",
    amount: 2150,
    tradedAt: "2026-04-10T09:12:00.000Z",
    dateLabel: "Hoje, 09:12",
  },
  {
    id: "tx-2",
    assetTicker: "B5P211",
    assetName: "Tesouro IPCA",
    type: "COMPRA",
    amount: 1000,
    tradedAt: "2026-04-09T18:40:00.000Z",
    dateLabel: "Ontem, 18:40",
  },
  {
    id: "tx-3",
    assetTicker: "HASH11",
    assetName: "Cripto ETF",
    type: "VENDA",
    amount: 860,
    tradedAt: "2026-03-12T15:00:00.000Z",
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
  phone: "+55 11 99999-9999",
  image: null,
  role: "USER",
  birthDate: "1990-01-10T00:00:00.000Z",
  initials: "FT",
  roleLabel: "Investidor",
  activeBasketName: "Risk Parity Brasil",
};

export const transactionTypeOptions: TransactionType[] = ["COMPRA", "VENDA"];

export const mockRebalancePreview: RebalancePreview = {
  portfolioValue: 184320,
  investedValue: 179712,
  cashAvailable: 4608,
  calculationBaseValue: 184320,
  rebalanceCost: 4180,
  postRebalanceCash: 428,
  includeCash: true,
  driftPercentage: 8.4,
  targetBasketName: "Risk Parity Brasil",
  eligibleForRebalance: true,
  missingProfileFields: [],
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
