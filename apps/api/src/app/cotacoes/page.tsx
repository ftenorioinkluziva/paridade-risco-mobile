"use client";

import { useEffect, useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { useAsyncData } from "@/context/AuthContext";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

type AssetPrice = {
  ticker: string;
  name: string;
  calculationType: string;
  price: number | null;
  bid: number | null;
  ask: number | null;
  changePercent: number | null;
  priceDate: string | null;
  source: string | null;
  observedAt: string | null;
  fetchedAt: string | null;
  freshness: "FRESH" | "STALE" | "UNAVAILABLE";
};

const QUOTES_REFRESH_INTERVAL_MS = 10 * 60_000;

function formatPrice(item: AssetPrice) {
  if (item.price === null) return "Sem cotação";

  if (item.calculationType === "PERCENTUAL") {
    return `${item.price.toFixed(2).replace(".", ",")}%`;
  }

  return formatCurrency(item.price);
}

function formatQuote(value: number | null) {
  return value === null ? "—" : formatCurrency(value);
}

function formatChangePercent(value: number | null) {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function sourceLabel(source: string | null) {
  if (source === "BRAPI") return "Brapi";
  if (source === "YAHOO_FINANCE") return "Yahoo";
  return "Sem fonte";
}

function freshnessLabel(freshness: AssetPrice["freshness"]) {
  if (freshness === "FRESH") return "ATUALIZADA";
  if (freshness === "STALE") return "DESATUALIZADA";
  return "INDISPONÍVEL";
}

export default function CotacoesPage() {
  const quotes = useAsyncData(async () => {
    const response = await fetch("/api/assets/prices?source=MARKET_DATA", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error((await response.text().catch(() => "")) || `HTTP ${response.status}`);
    return (await response.json()) as AssetPrice[];
  });
  const { refetch: refetchQuotes } = quotes;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function refreshQuotes() {
      if (document.visibilityState === "hidden") return;

      setIsRefreshing(true);
      await refetchQuotes();
      if (isMounted) {
        setLastRefreshAt(new Date());
        setIsRefreshing(false);
      }
    }

    const intervalId = window.setInterval(refreshQuotes, QUOTES_REFRESH_INTERVAL_MS);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [refetchQuotes]);

  const prices = quotes.data ?? [];
  const stalePrices = prices.filter((item) => item.freshness === "STALE");
  const unavailablePrices = prices.filter((item) => item.freshness === "UNAVAILABLE");

  return (
    <AuthGuard>
      <Screen
        title="Cotações"
        subtitle="ETFs estratégicos consultados pela Brapi com fallback Yahoo Finance."
      >
        <section style={styles.liveStatus} aria-live="polite">
          <div style={styles.liveStatusCopy}>
            <span style={styles.sectionLabel}>// MONITORAMENTO_CONTÍNUO</span>
            <strong style={styles.liveStatusTitle}>
              {isRefreshing ? "Atualizando cotações..." : "Atualização automática ativa"}
            </strong>
            <span style={styles.liveStatusText}>
              {lastRefreshAt
                ? `Última consulta: ${formatDateTime(lastRefreshAt.toISOString())}.`
                : "A página consulta os preços a cada 10 minutos durante o pregão."}
            </span>
          </div>
          <PrimaryButton
            label={isRefreshing ? "Atualizando..." : "Atualizar agora"}
            onPress={async () => {
              setIsRefreshing(true);
              await refetchQuotes();
              setLastRefreshAt(new Date());
              setIsRefreshing(false);
            }}
            disabled={isRefreshing}
            tone="neutral"
          />
        </section>

        {quotes.error ? (
          <div style={styles.errorCard}>
            <span style={styles.errorTitle}>Erro ao carregar cotações</span>
            <span style={styles.errorText}>{quotes.error}</span>
          </div>
        ) : null}

        {stalePrices.length > 0 || unavailablePrices.length > 0 ? (
          <section style={styles.staleAlert} aria-live="polite">
            <strong style={styles.staleAlertTitle}>Há preços que não estão atuais</strong>
            <span style={styles.staleAlertText}>
              {stalePrices.length > 0 ? `${stalePrices.length} ETF(s) estão desatualizados. ` : ""}
              {unavailablePrices.length > 0 ? `${unavailablePrices.length} ETF(s) sem cotação disponível.` : ""}
              {" "}O último valor permanece visível apenas como referência.
            </span>
          </section>
        ) : null}

        {quotes.isLoading && !quotes.error ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyTitle}>Carregando cotações...</span>
          </div>
        ) : null}

        {!quotes.isLoading && !quotes.error && prices.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyTitle}>Nenhuma cotação disponível.</span>
            <span style={styles.emptyText}>
              Verifique a chave da Brapi e a conectividade dos provedores de mercado.
            </span>
          </div>
        ) : null}

        {!quotes.error && prices.length > 0 ? (
          <div style={styles.list}>
            <div>
              <div style={styles.sectionLabel}>{"// ETFs_MONITORADOS"}</div>
              <span style={styles.listHint}>Brapi como fonte primária; Yahoo Finance como fallback.</span>
            </div>
            {prices.map((item) => (
              <div key={item.ticker} style={styles.card}>
                <div style={styles.topRow}>
                  <div style={styles.assetBlock}>
                    <span style={styles.ticker}>{item.ticker}</span>
                    <span style={styles.name}>{item.name}</span>
                  </div>
                  <div style={styles.priceBlock}>
                    <span style={styles.quoteLabel}>Último negócio</span>
                    <span style={styles.price}>{formatPrice(item)}</span>
                  </div>
                </div>

                <div style={styles.quoteGrid}>
                  <QuoteMetric label="Bid · melhor compra" value={formatQuote(item.bid)} />
                  <QuoteMetric label="Ask · melhor venda" value={formatQuote(item.ask)} />
                  <QuoteMetric label="Variação" value={formatChangePercent(item.changePercent)} />
                </div>

                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>
                    {sourceLabel(item.source)} · {freshnessLabel(item.freshness)}
                  </span>
                  <div style={styles.metaRight}>
                    <span style={{ ...styles.freshnessBadge, ...(item.freshness === "STALE" ? styles.staleBadge : item.freshness === "UNAVAILABLE" ? styles.unavailableBadge : {}) }}>
                      {freshnessLabel(item.freshness)}
                    </span>
                    <span style={styles.metaValue}>{item.priceDate ? formatDateTime(item.priceDate) : "Sem histórico"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Screen>
    </AuthGuard>
  );
}

function QuoteMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.quoteMetric}>
      <span style={styles.quoteLabel}>{label}</span>
      <strong style={styles.quoteValue}>{value}</strong>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  liveStatus: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: layout.space.md,
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
  },
  liveStatusCopy: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  liveStatusTitle: {
    color: colors.success,
    fontSize: 14,
    lineHeight: "20px",
  },
  liveStatusText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: "18px",
  },
  staleAlert: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    padding: layout.space.md,
    backgroundColor: colors.accentPanel,
    borderColor: colors.warning,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
  },
  staleAlertTitle: {
    color: colors.warning,
    fontFamily: typography.mono,
    fontSize: 13,
    fontWeight: 700,
  },
  staleAlertText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: "18px",
  },
  registerPanel: {
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
  panelHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: "24px",
    margin: "5px 0 0",
  },
  panelText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: "19px",
    margin: 0,
  },
  link: {
    color: colors.accentCyan,
    fontFamily: typography.mono,
    fontSize: 11,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(180px, 1fr) auto",
    gap: layout.space.sm,
    alignItems: "center",
  },
  formError: { color: colors.danger, fontSize: 12, lineHeight: "18px" },
  formNotice: { color: colors.success, fontSize: 12, lineHeight: "18px" },
  listHint: { display: "block", color: colors.textMuted, fontSize: 12, marginTop: 5 },
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
  priceBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 3,
  },
  quoteLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 10,
    lineHeight: "15px",
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
  quoteGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 1,
    backgroundColor: colors.border,
    border: `1px solid ${colors.border}`,
  },
  quoteMetric: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: layout.space.sm,
    backgroundColor: colors.surfaceAlt,
  },
  quoteValue: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 13,
    lineHeight: "18px",
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
  metaRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  freshnessBadge: {
    color: colors.success,
    borderColor: colors.success,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    fontFamily: typography.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 0.4,
    padding: "2px 6px",
  },
  staleBadge: {
    color: colors.warning,
    borderColor: colors.warning,
  },
  unavailableBadge: {
    color: colors.danger,
    borderColor: colors.danger,
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
