import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef } from "react";

const DEFAULT_STALE_MS = 20_000;

export function useStaleFocusRefetch(refetch: () => Promise<void>, staleMs = DEFAULT_STALE_MS) {
  const lastRefetchAt = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const age = now - lastRefetchAt.current;

      if (age < staleMs) {
        return;
      }

      lastRefetchAt.current = now;
      void refetch().catch(() => {
        // Allow another attempt on next focus if this one failed
        lastRefetchAt.current = 0;
      });
    }, [refetch, staleMs]),
  );

  const markFresh = useCallback(() => {
    lastRefetchAt.current = Date.now();
  }, []);

  return {
    markFresh,
  };
}
