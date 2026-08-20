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
  changePercent: number | null;
  source: string | null;
  observedAt: string | null;
  fetchedAt: string | null;
  freshness: "FRESH" | "STALE" | "UNAVAILABLE";
};

const QUOTES_REFRESH_INTERVAL_MS = 10 * 60_000;

function formatPrice(item: AssetPrice) {
  if (item.price === null) return "Sem cotação";
  if (item.calculationType === "PERCENTUAL") return `${item.price.toFixed(2).replace(".", ",")}%`;
  return formatCurrency(item.price);
}

function formatChangePercent(value: number | null) {
  if (value === null) return "Não disponível";
  return `${value >= 0 ? "+" : ""}${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function sourceLabel(source: string | null) {
  if (source === "BRAPI") return "Principal";
  if (source === "YAHOO_FINANCE") return "Alternativa";
  return "Sem origem";
}

function sourceDelayLabel(source: string | null) {
  if (source === "BRAPI" || source === "YAHOO_FINANCE") return "Pode haver atraso";
  return "Não disponível";
}

function freshnessLabel(freshness: AssetPrice["freshness"]) {
  if (freshness === "FRESH") return "Atualizada";
  if (freshness === "STALE") return "Desatualizada";
  return "Indisponível";
}

function latestFetchedAt(prices: AssetPrice[]) {
  const timestamps = prices
    .map((item) => item.fetchedAt ? new Date(item.fetchedAt).getTime() : Number.NaN)
    .filter(Number.isFinite);
  return timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null;
}

function sourceSummary(prices: AssetPrice[]) {
  const brapi = prices.filter((item) => item.source === "BRAPI").length;
  const yahoo = prices.filter((item) => item.source === "YAHOO_FINANCE").length;
  if (brapi > 0 && yahoo > 0) return `${brapi} principais · ${yahoo} alternativas`;
  if (brapi > 0) return `${brapi} principais`;
  if (yahoo > 0) return `${yahoo} alternativas`;
  return "Sem origem disponível";
}

export default function CotacoesPage() {
  const quotes = useAsyncData(async () => {
    const response = await fetch("/api/assets/prices?source=MARKET_DATA", { cache: "no-store" });
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

  async function reloadSnapshot() {
    setIsRefreshing(true);
    await refetchQuotes();
    setLastRefreshAt(new Date());
    setIsRefreshing(false);
  }

  const prices = quotes.data ?? [];
  const freshPrices = prices.filter((item) => item.freshness === "FRESH");
  const stalePrices = prices.filter((item) => item.freshness === "STALE");
  const unavailablePrices = prices.filter((item) => item.freshness === "UNAVAILABLE");
  const schedulerFetchedAt = latestFetchedAt(prices);

  return (
    <AuthGuard>
      <Screen title="Cotações" subtitle="ETFs estratégicos acompanhados por consulta automática e fonte alternativa.">
        <section style={styles.operationalPanel} aria-live="polite">
          <div style={styles.operationalHeader}>
            <div style={styles.liveStatusCopy}>
              <span style={styles.sectionLabel}>// SNAPSHOT_DE_MERCADO</span>
              <strong style={styles.liveStatusTitle}>
                {isRefreshing ? "Recarregando snapshot..." : "Monitoramento automático ativo"}
              </strong>
              <span style={styles.liveStatusText}>Consulta a cada 8 minutos durante o pregão, com captura final às 17:30.</span>
              {lastRefreshAt ? (
                <span style={styles.reloadStatus}>Visualização recarregada em {formatDateTime(lastRefreshAt.toISOString())}</span>
              ) : null}
            </div>
            <PrimaryButton
              label={isRefreshing ? "Recarregando..." : "Recarregar snapshot"}
              onPress={reloadSnapshot}
              disabled={isRefreshing}
              tone="neutral"
            />
          </div>
          <div style={styles.summaryGrid}>
            <SummaryMetric label="Último ciclo" value={schedulerFetchedAt ? formatDateTime(schedulerFetchedAt) : "Aguardando primeiro ciclo"} />
            <SummaryMetric label="Cobertura" value={`${freshPrices.length} de ${prices.length || 11} atualizadas`} />
            <SummaryMetric label="Origens no snapshot" value={sourceSummary(prices)} />
            <SummaryMetric label="Agenda" value="8 min · fechamento 17:30" />
          </div>
        </section>

        {quotes.error ? (
          <div style={styles.errorCard}>
            <span style={styles.errorTitle}>Erro ao carregar cotações</span>
            <span style={styles.errorText}>{quotes.error}</span>
          </div>
        ) : null}

        {stalePrices.length > 0 || unavailablePrices.length > 0 ? (
          <section style={styles.staleAlert} aria-live="polite" role="status">
            <strong style={styles.staleAlertTitle}>Preço de referência com atraso</strong>
            <span style={styles.staleAlertText}>
              {stalePrices.length > 0 ? `${stalePrices.length} ETF(s) excederam o limite de frescor. ` : ""}
              {unavailablePrices.length > 0 ? `${unavailablePrices.length} ETF(s) estão sem cotação. ` : ""}
              Os valores permanecem visíveis como referência e não representam preço em tempo real.
            </span>
          </section>
        ) : null}

        {quotes.isLoading && !quotes.error ? (
          <div style={styles.emptyState}><span style={styles.emptyTitle}>Carregando cotações...</span></div>
        ) : null}

        {!quotes.isLoading && !quotes.error && prices.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyTitle}>Nenhuma cotação disponível.</span>
            <span style={styles.emptyText}>Verifique a conectividade do serviço de cotações.</span>
          </div>
        ) : null}

        {!quotes.error && prices.length > 0 ? (
          <div style={styles.list}>
            <div>
              <div style={styles.sectionLabel}>// ETFs_MONITORADOS</div>
              <span style={styles.listHint}>Consulta principal com fonte alternativa quando necessário.</span>
            </div>
            {prices.map((item) => (
              <article key={item.ticker} style={styles.card}>
                <div style={styles.topRow}>
                  <div style={styles.assetBlock}>
                    <div style={styles.assetIdentity}>
                      <span style={styles.ticker}>{item.ticker}</span>
                      <span style={styles.sourceBadge}>{sourceLabel(item.source)}</span>
                    </div>
                    <span style={styles.name}>{item.name}</span>
                  </div>
                  <div style={styles.priceBlock}>
                    <span style={styles.quoteLabel}>Último preço</span>
                    <span style={styles.price}>{formatPrice(item)}</span>
                    <span style={{ ...styles.freshnessBadge, ...(item.freshness === "STALE" ? styles.staleBadge : item.freshness === "UNAVAILABLE" ? styles.unavailableBadge : {}) }}>
                      {freshnessLabel(item.freshness)}
                    </span>
                  </div>
                </div>

                <div style={styles.marketDetails}>
                  <QuoteMetric label="Variação" value={formatChangePercent(item.changePercent)} />
                  <QuoteMetric label="Atualidade do dado" value={sourceDelayLabel(item.source)} />
                </div>

                <div style={styles.timeGrid}>
                  <TimeMetric label="Preço observado" value={item.observedAt ? formatDateTime(item.observedAt) : "Não disponível"} />
                  <TimeMetric label="Consultado pelo scheduler" value={item.fetchedAt ? formatDateTime(item.fetchedAt) : "Não disponível"} />
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </Screen>
    </AuthGuard>
  );
}

function QuoteMetric({ label, value }: { label: string; value: string }) {
  return <div style={styles.quoteMetric}><span style={styles.quoteLabel}>{label}</span><strong style={styles.quoteValue}>{value}</strong></div>;
}

function TimeMetric({ label, value }: { label: string; value: string }) {
  return <div style={styles.timeMetric}><span style={styles.quoteLabel}>{label}</span><span style={styles.metaValue}>{value}</span></div>;
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return <div style={styles.summaryMetric}><span style={styles.quoteLabel}>{label}</span><strong style={styles.summaryValue}>{value}</strong></div>;
}

const styles: Record<string, React.CSSProperties> = {
  operationalPanel: { display: "flex", flexDirection: "column", backgroundColor: colors.accentPanel, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md, overflow: "hidden" },
  operationalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, padding: layout.space.md },
  liveStatusCopy: { display: "flex", flexDirection: "column", gap: 5 },
  liveStatusTitle: { color: colors.text, fontSize: 14, lineHeight: "20px" },
  liveStatusText: { color: colors.textMuted, fontSize: 12, lineHeight: "18px", maxWidth: 680 },
  reloadStatus: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 10, lineHeight: "15px" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", borderTop: `1px solid ${colors.border}` },
  summaryMetric: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0, padding: layout.space.md, borderBottom: `1px solid ${colors.border}` },
  summaryValue: { color: colors.text, fontFamily: typography.mono, fontSize: 12, lineHeight: "18px", overflowWrap: "anywhere" },
  staleAlert: { display: "flex", flexDirection: "column", gap: 5, padding: layout.space.md, backgroundColor: colors.accentPanel, border: `1px solid ${colors.warning}`, borderRadius: layout.radius.md },
  staleAlertTitle: { color: colors.warning, fontFamily: typography.mono, fontSize: 13, fontWeight: 700 },
  staleAlertText: { color: colors.textMuted, fontSize: 12, lineHeight: "18px", maxWidth: 760 },
  listHint: { display: "block", color: colors.textMuted, fontSize: 12, marginTop: 5 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  sectionLabel: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" },
  card: { display: "flex", flexDirection: "column", gap: layout.space.sm, padding: layout.space.md, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  assetBlock: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0 },
  assetIdentity: { display: "flex", alignItems: "center", gap: 8 },
  ticker: { color: colors.text, fontFamily: typography.mono, fontSize: 16, fontWeight: 700, lineHeight: "22px" },
  sourceBadge: { color: colors.textMuted, backgroundColor: colors.surfaceAlt, borderRadius: 4, fontFamily: typography.mono, fontSize: 9, fontWeight: 700, lineHeight: "14px", padding: "2px 6px" },
  name: { color: colors.textMuted, fontSize: 13, lineHeight: "18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  priceBlock: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  price: { color: colors.text, fontFamily: typography.mono, fontSize: 18, fontWeight: 700, lineHeight: "24px", textAlign: "right", whiteSpace: "nowrap" },
  quoteLabel: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 10, lineHeight: "15px" },
  marketDetails: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 1, backgroundColor: colors.border, border: `1px solid ${colors.border}` },
  quoteMetric: { display: "flex", flexDirection: "column", gap: 4, padding: layout.space.sm, backgroundColor: colors.surfaceAlt },
  quoteValue: { color: colors.text, fontFamily: typography.mono, fontSize: 13, lineHeight: "18px" },
  timeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, paddingTop: 6, borderTop: `1px solid ${colors.border}` },
  timeMetric: { display: "flex", flexDirection: "column", gap: 3 },
  metaValue: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 11, lineHeight: "16px" },
  freshnessBadge: { color: colors.success, border: `1px solid ${colors.success}`, borderRadius: 4, fontFamily: typography.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.4, padding: "2px 6px" },
  staleBadge: { color: colors.warning, borderColor: colors.warning },
  unavailableBadge: { color: colors.danger, borderColor: colors.danger },
  errorCard: { backgroundColor: colors.accentPanel, border: `1px solid ${colors.danger}`, borderRadius: layout.radius.md, display: "flex", flexDirection: "column", gap: layout.space.sm, padding: layout.space.xl },
  errorTitle: { color: colors.danger, fontFamily: typography.mono, fontSize: 14, fontWeight: 600 },
  errorText: { color: colors.textSoft, fontSize: 12, lineHeight: "18px" },
  emptyState: { backgroundColor: colors.accentPanel, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md, display: "flex", flexDirection: "column", gap: layout.space.sm, padding: layout.space.xl, textAlign: "center" },
  emptyTitle: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 14, fontWeight: 600 },
  emptyText: { color: colors.textSoft, fontSize: 12, lineHeight: "18px" },
};
