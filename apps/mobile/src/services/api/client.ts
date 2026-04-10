import type { CreateTransactionInput, UpdateBasketInput } from "@paridade-risco/shared";

import type {
  ActiveBasket,
  AssetOption,
  BasketDetail,
  BasketListItem,
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

  async listTransactions(): Promise<TransactionItem[]> {
    return requestJson<TransactionItem[]>("/api/transactions");
  },

  async listAssets(): Promise<AssetOption[]> {
    return requestJson<AssetOption[]>("/api/assets");
  },

  async getActiveBasket(): Promise<ActiveBasket> {
    return requestJson<ActiveBasket>("/api/baskets/active");
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
