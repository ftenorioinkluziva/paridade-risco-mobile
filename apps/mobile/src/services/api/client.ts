import type { CreateTransactionInput, UpdateBasketInput } from "@paridade-risco/shared";

import type {
  ActiveBasket,
  AssetOption,
  BasketDetail,
  BasketListItem,
  InvestmentFund,
  PortfolioSummary,
  TransactionItem,
  UserProfile,
} from "../../domain/models";
import type { RebalancePreview } from "../../domain/rebalance";
import type { LoginInput } from "@paridade-risco/shared";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
let sessionToken: string | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}

async function requestJson<T>(path: string, init?: RequestInit) {
  if (!API_BASE_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const apiClient = {
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    return requestJson<PortfolioSummary>("/api/portfolio/summary");
  },

  async listTransactions(filters?: {
    assetTicker?: string;
    from?: string;
    to?: string;
    type?: "COMPRA" | "VENDA";
  }): Promise<TransactionItem[]> {
    const params = new URLSearchParams();

    if (filters?.type) {
      params.set("type", filters.type);
    }

    if (filters?.assetTicker) {
      params.set("assetTicker", filters.assetTicker);
    }

    if (filters?.from) {
      params.set("from", filters.from);
    }

    if (filters?.to) {
      params.set("to", filters.to);
    }

    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    return requestJson<TransactionItem[]>(`/api/transactions${suffix}`);
  },

  async listAssets(): Promise<AssetOption[]> {
    return requestJson<AssetOption[]>("/api/assets");
  },

  async getActiveBasket(): Promise<ActiveBasket | null> {
    if (!API_BASE_URL) {
      throw new Error("EXPO_PUBLIC_API_URL is not configured");
    }

    const response = await fetch(`${API_BASE_URL}/api/baskets/active`, {
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return (await response.json()) as ActiveBasket;
  },

  async listBaskets(): Promise<BasketListItem[]> {
    return requestJson<BasketListItem[]>("/api/baskets");
  },

  async getBasketDetail(basketId: string): Promise<BasketDetail> {
    return requestJson<BasketDetail>(`/api/baskets/${basketId}`);
  },

  async getProfile(): Promise<UserProfile> {
    return requestJson<UserProfile>("/api/profile");
  },

  async updateProfile(input: {
    birthDate?: string | null;
    image?: string | null;
    phone?: string | null;
    role?: "ADMIN" | "USER";
  }): Promise<Pick<UserProfile, "birthDate" | "id" | "image" | "phone" | "role">> {
    return requestJson<Pick<UserProfile, "birthDate" | "id" | "image" | "phone" | "role">>("/api/profile", {
      body: JSON.stringify(input),
      method: "PUT",
    });
  },

  async updateCashBalance(cashBalance: number): Promise<{ cashBalance: number; id: string; userId: string }> {
    return requestJson<{ cashBalance: number; id: string; userId: string }>("/api/portfolio/cash", {
      body: JSON.stringify({ cashBalance }),
      method: "PUT",
    });
  },

  async listFunds(): Promise<InvestmentFund[]> {
    return requestJson<InvestmentFund[]>("/api/funds");
  },

  async createFund(input: {
    currentValue: number;
    indexAssetId?: string | null;
    initialInvestment: number;
    investmentDate: string;
    name: string;
  }): Promise<InvestmentFund> {
    return requestJson<InvestmentFund>("/api/funds", {
      body: JSON.stringify(input),
      method: "POST",
    });
  },

  async updateFund(
    fundId: string,
    input: {
      currentValue?: number;
      indexAssetId?: string | null;
      initialInvestment?: number;
      investmentDate?: string;
      name?: string;
    },
  ): Promise<InvestmentFund> {
    return requestJson<InvestmentFund>(`/api/funds/${fundId}`, {
      body: JSON.stringify(input),
      method: "PUT",
    });
  },

  async updateFundValue(fundId: string, currentValue: number): Promise<InvestmentFund> {
    return requestJson<InvestmentFund>(`/api/funds/${fundId}`, {
      body: JSON.stringify({ currentValue }),
      method: "PUT",
    });
  },

  async deleteFund(fundId: string): Promise<void> {
    await requestJson<{ ok: true; id: string }>(`/api/funds/${fundId}`, {
      method: "DELETE",
    });
  },

  async getRebalancePreview(): Promise<RebalancePreview> {
    return requestJson<RebalancePreview>("/api/rebalance/preview");
  },

  async createTransaction(input: CreateTransactionInput): Promise<TransactionItem> {
    return requestJson<TransactionItem>("/api/transactions", {
      body: JSON.stringify(input),
      method: "POST",
    });
  },

  async updateBasket(basketId: string, input: UpdateBasketInput): Promise<BasketDetail> {
    return requestJson<BasketDetail>(`/api/baskets/${basketId}`, {
      body: JSON.stringify(input),
      method: "PUT",
    });
  },

  async signIn(input: LoginInput): Promise<{ token: string; user: Omit<UserProfile, "activeBasketName"> }> {
    return requestJson<{ token: string; user: Omit<UserProfile, "activeBasketName"> }>("/api/auth/login", {
      body: JSON.stringify(input),
      method: "POST",
    });
  },

  async getCurrentSessionUser(): Promise<Omit<UserProfile, "activeBasketName">> {
    return requestJson<Omit<UserProfile, "activeBasketName">>("/api/auth/me");
  },

  async signOut(): Promise<void> {
    await requestJson<{ ok: true }>("/api/auth/logout", {
      method: "POST",
    });
  },
};
