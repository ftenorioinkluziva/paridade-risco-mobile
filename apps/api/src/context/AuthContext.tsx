"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { LoginInput } from "@paridade-risco/shared";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  role: "ADMIN" | "USER";
  birthDate: string | null;
  activeBasketName: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  refetchUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "pr_session_token";
const API_BASE =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  // Some endpoints (e.g. DELETE) return 200/204 with no body
  const body = await res.text();
  if (!body) return undefined as unknown as T;
  return JSON.parse(body);
}

export const api = {
  getPortfolioSummary: () => apiFetch<any>("/api/portfolio/summary"),
  getRebalancePreview: () => apiFetch<any>("/api/rebalance/preview"),
  getPricesStatus: () => apiFetch<any>("/api/admin/prices"),
  getAssets: () => apiFetch<any[]>("/api/assets"),
  getBaskets: () => apiFetch<any[]>("/api/baskets"),
  getBasketDetail: (id: string) => apiFetch<any>(`/api/baskets/${id}`),
  getBasketActive: () => apiFetch<any>("/api/baskets/active"),
  getFunds: () => apiFetch<any[]>("/api/funds"),
getFundDetail: (id: string) => apiFetch<any>(`/api/funds/${id}`),
  createFund: (data: any) =>
    apiFetch<any>("/api/funds", { method: "POST", body: JSON.stringify(data) }),
  updateFund: (id: string, data: any) =>
    apiFetch<any>(`/api/funds/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteFund: (id: string) =>
    apiFetch<any>(`/api/funds/${id}`, { method: "DELETE" }),
  getProfile: () => apiFetch<any>("/api/profile"),
  getTransactions: (filters?: Record<string, string>) => {
    const params = filters ? "?" + new URLSearchParams(filters).toString() : "";
    return apiFetch<any[]>(`/api/transactions${params}`);
  },
  createTransaction: (data: any) =>
    apiFetch<any>("/api/transactions", { method: "POST", body: JSON.stringify(data) }),
  updateBasket: (id: string, data: any) =>
    apiFetch<any>(`/api/baskets/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  createBasket: (data: any) =>
    apiFetch<any>("/api/baskets", { method: "POST", body: JSON.stringify(data) }),
  deleteBasket: (id: string) =>
    apiFetch<any>(`/api/baskets/${id}`, { method: "DELETE" }),
  activateBasket: (id: string, action?: string) =>
    apiFetch<any>(`/api/baskets/${id}/activate`, {
      method: "PATCH",
      body: action ? JSON.stringify({ action }) : undefined,
    }),
  signIn: (input: LoginInput) =>
    apiFetch<{ token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  signOut: () => apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  getMe: () => apiFetch<any>("/api/auth/me"),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const profile = await api.getMe();
      setUser({ ...profile, activeBasketName: profile.activeBasketName || "Sem cesta ativa" });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { restoreSession(); }, [restoreSession]);

  const value = useMemo<AuthContextValue>(() => ({
    isAuthenticated: Boolean(user),
    isLoading,
    user,
    async signIn(input) {
      const result = await api.signIn(input);
      localStorage.setItem(STORAGE_KEY, result.token);
      setUser({ ...result.user, activeBasketName: "Sem cesta ativa" });
    },
    async signOut() {
      try { await api.signOut(); } catch { /* ignore */ }
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    },
    async refetchUser() {
      try {
        const profile = await api.getProfile();
        setUser(profile);
      } catch { /* ignore */ }
    },
  }), [isLoading, user, restoreSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useAsyncData<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await loaderRef.current());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, error, isLoading, refetch } as const;
}

// Convenience hooks
// --- FIX: infinite polling loop suppressed ---
export function usePortfolioSummary() {
  return useAsyncData(() => api.getPortfolioSummary());
}
export function useRebalancePreview() {
  return useAsyncData(() => api.getRebalancePreview());
}
export function useTransactions(filters?: Record<string, string>) {
  return useAsyncData(() => api.getTransactions(filters));
}
export function useAssets() {
  return useAsyncData(() => api.getAssets());
}
export function useBaskets() {
  return useAsyncData(() => api.getBaskets());
}
export function useBasketDetail(id: string) {
  return useAsyncData(() => api.getBasketDetail(id));
}
export function useFunds() {
  return useAsyncData(() => api.getFunds());
}
export function useFundDetail(id: string) {
  return useAsyncData(() => api.getFundDetail(id));
}
export function useProfile() {
  return useAsyncData(() => api.getProfile());
}