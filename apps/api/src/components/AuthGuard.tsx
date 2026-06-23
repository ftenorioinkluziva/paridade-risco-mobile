"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type AuthGuardProps = {
  children: ReactNode;
  /** Optional — if true, redirects authenticated users away (e.g. login page) */
  redirectIfAuthenticated?: boolean;
};

/**
 * AuthGuard blocks access to protected pages for unauthenticated users.
 * - If user is not authenticated and `redirectIfAuthenticated` is false:
 *   redirects to /login
 * - Shows nothing during loading to avoid flash of content
 */
export function AuthGuard({ children, redirectIfAuthenticated = false }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (redirectIfAuthenticated && isAuthenticated) {
      router.replace("/");
      return;
    }

    if (!redirectIfAuthenticated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, redirectIfAuthenticated, router]);

  // Show nothing while loading or if redirect is pending
  if (isLoading) return null;
  if (!redirectIfAuthenticated && !isAuthenticated) return null;
  if (redirectIfAuthenticated && isAuthenticated) return null;

  return <>{children}</>;
}