"use client";

import { useEffect, useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { Screen } from "@/components/Screen";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

type AssetPrice = {
  ticker: string;
  name: string;
  calculationType: string;
  price: number | null;
  priceDate: string | null;
};

function formatPrice(item: AssetPrice) {
  if (item.price === null) return "Sem cotação";

  if (item.calculationType === "PERCENTUAL") {
    return `${item.price.toFixed(2).replace(".", ",")}%`;
  }

  return formatCurrency(item.price);
}

export default function CotacoesPage() {
  const [prices, setPrices] = useState<AssetPrice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPrices() {
      try {
        const response = await fetch("/api/assets/prices");

        if (!response.ok) {
          const text = await response.text().catch(() => response.statusText);
          throw new Error(text || `HTTP ${response.status}`);
        }

        const body = (await response.json()) as AssetPrice[];

        if (isMounted) {
          setPrices(body);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Erro ao carregar cotações");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPrices();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AuthGuard>
      <Screen
        title="Cotações"
        subtitle="Últimas cotações dos ativos monitorados pelo sistema."
      >
        {error ? (
          <div style={styles.errorCard}>
            <span style={styles.errorTitle}>Erro ao carregar cotações</span>
            <span style={styles.errorText}>{error}</span>
          </div>
        ) : null}

        {isLoading && !error ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyTitle}>Carregando cotações...</span>
          </div>
        ) : null}

        {!isLoading && !error && prices.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyTitle}>Nenhum ativo monitorado.</span>
            <span style={styles.emptyText}>
              Ative ativos no sistema para acompanhar suas últimas cotações.
            </span>
          </div>
        ) : null}

        {!isLoading && !error && prices.length > 0 ? (
          <div style={styles.list}>
            <div style={styles.sectionLabel}>{"// ATIVOS_MONITORADOS"}</div>
            {prices.map((item) => (
              <div key={item.ticker} style={styles.card}>
                <div style={styles.topRow}>
                  <div style={styles.assetBlock}>
                    <span style={styles.ticker}>{item.ticker}</span>
                    <span style={styles.name}>{item.name}</span>
                  </div>
                  <span style={styles.price}>{formatPrice(item)}</span>
                </div>

                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>
                    {item.calculationType === "PERCENTUAL" ? "Percentual" : "Preço"}
                  </span>
                  <span style={styles.metaValue}>
                    {item.priceDate ? formatDateTime(item.priceDate) : "Sem histórico"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Screen>
    </AuthGuard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
    padding: layout.space.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  assetBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },
  ticker: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 16,
    fontWeight: 700,
    lineHeight: "22px",
  },
  name: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: "18px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  price: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 16,
    fontWeight: 700,
    lineHeight: "22px",
    textAlign: "right" as const,
    whiteSpace: "nowrap" as const,
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingTop: 6,
    borderTopColor: colors.border,
    borderTopStyle: "solid" as const,
    borderTopWidth: 1,
  },
  metaLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    lineHeight: "16px",
  },
  metaValue: {
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: 11,
    lineHeight: "16px",
    textAlign: "right" as const,
  },
  errorCard: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.danger,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
    padding: layout.space.xl,
  },
  errorTitle: {
    color: colors.danger,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: 600,
  },
  errorText: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: "18px",
  },
  emptyState: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
    padding: layout.space.xl,
    textAlign: "center" as const,
  },
  emptyTitle: {
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: 600,
  },
  emptyText: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: "18px",
  },
};
