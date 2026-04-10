import { useEffect, useState } from "react";

import type {
  ActiveBasket,
  AssetOption,
  BasketDetail,
  BasketListItem,
  PortfolioSummary,
  TransactionItem,
  UserProfile,
} from "../domain/models";
import type { RebalancePreview } from "../domain/rebalance";
import { apiClient } from "../services/api/client";

type AsyncState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

function useAsyncData<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refetch() {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await loader();
      setData(nextData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refetch();
  }, []);

  return {
    data,
    error,
    isLoading,
    refetch,
  } satisfies AsyncState<T>;
}

export function usePortfolioSummary() {
  return useAsyncData<PortfolioSummary>(() => apiClient.getPortfolioSummary());
}

export function useTransactions() {
  return useAsyncData<TransactionItem[]>(() => apiClient.listTransactions());
}

export function useAssetOptions() {
  return useAsyncData<AssetOption[]>(() => apiClient.listAssets());
}

export function useActiveBasket() {
  return useAsyncData<ActiveBasket>(() => apiClient.getActiveBasket());
}

export function useBaskets() {
  return useAsyncData<BasketListItem[]>(() => apiClient.listBaskets());
}

export function useBasketDetail(basketId: string) {
  const [data, setData] = useState<BasketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refetch() {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await apiClient.getBasketDetail(basketId);
      setData(nextData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refetch();
  }, [basketId]);

  return {
    data,
    error,
    isLoading,
    refetch,
  } satisfies AsyncState<BasketDetail>;
}

export function useProfile() {
  return useAsyncData<UserProfile>(() => apiClient.getProfile());
}

export function useRebalancePreview() {
  return useAsyncData<RebalancePreview>(() => apiClient.getRebalancePreview());
}
