import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ActiveBasket,
  AssetOption,
  BasketDetail,
  BasketListItem,
  InvestmentFund,
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

function getReadableErrorMessage(nextError: unknown) {
  const message = nextError instanceof Error ? nextError.message : "";

  if (message.includes("EXPO_PUBLIC_API_URL")) {
    return "A conexao com a API nao esta configurada.";
  }

  if (message.includes("Request failed")) {
    return "A API nao respondeu como esperado.";
  }

  return "Nao foi possivel carregar os dados agora.";
}

function useAsyncData<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await loaderRef.current();
      setData(nextData);
    } catch (nextError) {
      setError(getReadableErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

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

export function useTransactions(filters?: {
  assetTicker?: string;
  from?: string;
  to?: string;
  type?: "COMPRA" | "VENDA";
}) {
  const [data, setData] = useState<TransactionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const filterKey = JSON.stringify(filters ?? {});

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await apiClient.listTransactions(filters);
      setData(nextData);
    } catch (nextError) {
      setError(getReadableErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    data,
    error,
    isLoading,
    refetch,
  } satisfies AsyncState<TransactionItem[]>;
}

export function useAssetOptions() {
  return useAsyncData<AssetOption[]>(() => apiClient.listAssets());
}

export function useActiveBasket() {
  return useAsyncData<ActiveBasket | null>(() => apiClient.getActiveBasket());
}

export function useBaskets() {
  return useAsyncData<BasketListItem[]>(() => apiClient.listBaskets());
}

export function useBasketDetail(basketId: string) {
  const [data, setData] = useState<BasketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await apiClient.getBasketDetail(basketId);
      setData(nextData);
    } catch (nextError) {
      setError(getReadableErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }, [basketId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

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
  const [data, setData] = useState<RebalancePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await apiClient.getRebalancePreview();
      setData(nextData);
    } catch (nextError) {
      setError(getReadableErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    data,
    error,
    isLoading,
    refetch,
  } satisfies AsyncState<RebalancePreview>;
}

export function useFunds() {
  return useAsyncData<InvestmentFund[]>(() => apiClient.listFunds());
}
