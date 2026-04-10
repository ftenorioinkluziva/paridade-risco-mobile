import type { LoginInput } from "@paridade-risco/shared";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { UserProfile } from "../domain/models";
import { clearStoredSessionToken, getStoredSessionToken, setStoredSessionToken } from "../lib/authStorage";
import { apiClient, setSessionToken } from "../services/api/client";

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  user: UserProfile | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const token = await getStoredSessionToken();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setSessionToken(token);
        const profile = await apiClient.getCurrentSessionUser();
        setUser({ ...profile, activeBasketName: "Sem cesta ativa" });
      } catch {
        await clearStoredSessionToken();
        setSessionToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isAuthenticated: Boolean(user),
    isLoading,
    user,
    async signIn(input) {
      const result = await apiClient.signIn(input);
      setSessionToken(result.token);
      await setStoredSessionToken(result.token);
      const profile = await apiClient.getProfile();
      setUser(profile);
    },
    async signOut() {
      try {
        await apiClient.signOut();
      } finally {
        setSessionToken(null);
        await clearStoredSessionToken();
        setUser(null);
      }
    },
  }), [isLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
