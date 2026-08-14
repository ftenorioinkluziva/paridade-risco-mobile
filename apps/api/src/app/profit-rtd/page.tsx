"use client";

import { useMemo, useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { api, useAsyncData } from "@/context/AuthContext";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

type BtgQuote = {
  asset: string;
  name: string;
  source: string;
  topic: string;
  quoteDate: string | null;
  quoteTime: string | null;
  last: string | null;
  open: string | null;
  high: string | null;
  low: string | null;
  strike: string | null;
  trades: number | null;
  expiration: string | null;
  receivedAt: string;
  updatedAt: string;
};

type DailyPrice = {
  ticker: string;
  name: string;
  price: number | null;
  priceDate: string | null;
};

const BTG_BRIDGE_COMMAND =
  "$bridge = 'C:\\projetos\\paridade-risco-mobile\\tools\\profit-rtd-bridge\\read-rtd.ps1'; pwsh -File $bridge -AssetsUrl 'http://localhost:3002/api/assets?source=BTG_TRADE_DESK' -AssetRefreshMilliseconds 5000 -Watch -PostUrl http://localhost:3002/api/integrations/profit/quotes -BearerToken $env:PROFIT_RTD_INGEST_SECRET";

function numericValue(value: string | null) {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function displayMoney(value: string | null) {
  const parsed = numericValue(value);
  return parsed === null ? "—" : formatCurrency(parsed);
}

function isStale(receivedAt: string) {
  return Date.now() - new Date(receivedAt).getTime() > 5 * 60 * 1000;
}

function quoteKey(quote: BtgQuote) {
  return `${quote.source}:${quote.asset}`;
}

export default function BtgRtdPage() {
  const liveQuotes = useAsyncData(() => api.getBtgLiveQuotes());
  const dailyPrices = useAsyncData(async () => {
    const response = await fetch("/api/assets/prices");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as DailyPrice[];
  });
  const [selectedQuoteKey, setSelectedQuoteKey] = useState("");
  const [copied, setCopied] = useState(false);

  const quotes = (liveQuotes.data ?? []) as BtgQuote[];
  const selectedQuote = quotes.find((quote) => quoteKey(quote) === selectedQuoteKey) ?? quotes[0] ?? null;
  const selectedDailyPrice = dailyPrices.data?.find((price) => price.ticker === selectedQuote?.asset) ?? null;
  const snapshotIsStale = selectedQuote ? isStale(selectedQuote.receivedAt) : false;
  const priceDelta = useMemo(() => {
    if (!selectedQuote || !selectedDailyPrice?.price) return null;
    const live = numericValue(selectedQuote.last);
    if (live === null) return null;
    return live - selectedDailyPrice.price;
  }, [selectedDailyPrice, selectedQuote]);

  async function refresh() {
    await Promise.all([liveQuotes.refetch(), dailyPrices.refetch()]);
  }

  async function copyBridgeCommand() {
    await navigator.clipboard?.writeText(BTG_BRIDGE_COMMAND);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const loading = liveQuotes.isLoading || dailyPrices.isLoading;
  const error = liveQuotes.error || dailyPrices.error;

  return (
    <AuthGuard>
      <Screen
        title="BTG Trader Desk RTD"
        subtitle="Leia cotações em tempo real do BTG Trader Desk e acompanhe o último snapshot recebido."
        action={<PrimaryButton label={loading ? "Atualizando..." : "Atualizar snapshots"} onPress={refresh} disabled={loading} tone="neutral" />}
      >
        <section style={styles.statusStrip}>
          <div style={styles.statusCopy}>
            <span style={styles.sectionLabel}>// STATUS_DA_BRIDGE</span>
            <strong style={{ ...styles.statusTitle, color: selectedQuote ? (snapshotIsStale ? colors.warning : colors.success) : colors.textMuted }}>
              {selectedQuote ? (snapshotIsStale ? "Snapshot desatualizado" : "Snapshot recebido") : "Aguardando snapshot"}
            </strong>
            <span style={styles.statusText}>
              {selectedQuote
                ? `Última leitura de ${selectedQuote.asset} em ${formatDateTime(selectedQuote.receivedAt)}.`
                : "Execute a bridge no mesmo computador em que o BTG Trader Desk está aberto."}
            </span>
          </div>
          <span style={{ ...styles.statusPill, color: selectedQuote && !snapshotIsStale ? colors.success : colors.warning }}>
            {selectedQuote ? (snapshotIsStale ? "REVISAR" : "CONECTADO") : "SEM DADOS"}
          </span>
        </section>

        {error ? (
          <section style={styles.errorPanel}>
            <strong style={styles.errorTitle}>Não foi possível carregar o monitor RTD</strong>
            <span style={styles.errorText}>{error}</span>
            <span style={styles.errorText}>Se o erro for 403, confirme que sua sessão possui acesso administrativo à integração.</span>
          </section>
        ) : null}

        <section style={styles.commandPanel}>
          <div style={styles.panelHeading}>
            <div>
              <span style={styles.sectionLabel}>// COMO_TESTAR</span>
              <h2 style={styles.panelTitle}>Publicar uma leitura RTD</h2>
            </div>
            <PrimaryButton label={copied ? "Copiado" : "Copiar comando BTG"} onPress={copyBridgeCommand} tone="neutral" />
          </div>
          <p style={styles.panelText}>
            O navegador apenas monitora os snapshots. A bridge usa o RTD local do BTG Trader Desk via TCP, descobre os ativos cadastrados e envia as leituras para a API.
          </p>
          <span style={styles.commandLabel}>BTG Trader Desk RTD</span>
          <code style={styles.command}>{BTG_BRIDGE_COMMAND}</code>
          <div style={styles.commandNote}>
            <span style={styles.noteMark}>!</span>
            <span>Configure <code>PROFIT_RTD_INGEST_SECRET</code> no ambiente da API e no PowerShell. O BTG precisa estar aberto com o RTD ativo. Novos ativos cadastrados em Cotações entram automaticamente na próxima atualização da lista.</span>
          </div>
        </section>

        <div style={styles.toolbar}>
          <div>
            <span style={styles.sectionLabel}>// SNAPSHOTS_RECEBIDOS</span>
            <span style={styles.toolbarText}>{quotes.length} ativo(s) persistido(s) pela fonte BTG_TRADE_DESK</span>
          </div>
          {quotes.length > 0 ? (
            <label style={styles.selectLabel}>
              Ativo
              <select value={selectedQuote ? quoteKey(selectedQuote) : ""} onChange={(event) => setSelectedQuoteKey(event.target.value)} style={styles.select}>
                {quotes.map((quote) => <option key={quoteKey(quote)} value={quoteKey(quote)}>{quote.asset} · {quote.source}</option>)}
              </select>
            </label>
          ) : null}
        </div>

        {!loading && !error && !selectedQuote ? (
          <section style={styles.emptyPanel}>
            <strong style={styles.emptyTitle}>Nenhum snapshot disponível ainda</strong>
            <span style={styles.emptyText}>Depois que a bridge publicar a primeira leitura, os valores normalizados aparecerão aqui.</span>
          </section>
        ) : null}

        {selectedQuote ? (
          <div style={styles.contentGrid}>
            <section style={styles.snapshotPanel}>
              <div style={styles.panelHeading}>
                <div>
                  <span style={styles.sectionLabel}>// LEITURA_INTRADAY</span>
                  <h2 style={styles.panelTitle}>{selectedQuote.asset}</h2>
                  <span style={styles.panelText}>{selectedQuote.name} · tópico {selectedQuote.topic}</span>
                </div>
                <div style={styles.heroValueBlock}>
                  <span style={styles.heroLabel}>ULT / ÚLTIMO</span>
                  <strong style={styles.heroValue}>{displayMoney(selectedQuote.last)}</strong>
                </div>
              </div>
              <div style={styles.metricGrid}>
                <Metric label="Abertura" value={displayMoney(selectedQuote.open)} />
                <Metric label="Máxima" value={displayMoney(selectedQuote.high)} />
                <Metric label="Mínima" value={displayMoney(selectedQuote.low)} />
                <Metric label="Negócios" value={selectedQuote.trades?.toLocaleString("pt-BR") ?? "—"} />
              </div>
            </section>

            <section style={styles.comparisonPanel}>
              <span style={styles.sectionLabel}>// COMPARAÇÃO_DE_FONTES</span>
              <h2 style={styles.panelTitle}>Intraday x cotação diária</h2>
              <div style={styles.sourceRow}>
                <div>
                  <span style={styles.sourceLabel}>{selectedQuote.source}</span>
                  <strong style={styles.sourceValue}>{displayMoney(selectedQuote.last)}</strong>
                  <span style={styles.sourceMeta}>recebido em {formatDateTime(selectedQuote.receivedAt)}</span>
                </div>
                <div style={styles.sourceDivider} />
                <div>
                  <span style={styles.sourceLabel}>COTAÇÃO_DIÁRIA</span>
                  <strong style={styles.sourceValue}>{selectedDailyPrice?.price == null ? "—" : formatCurrency(selectedDailyPrice.price)}</strong>
                  <span style={styles.sourceMeta}>{selectedDailyPrice?.priceDate ? `referência ${selectedDailyPrice.priceDate}` : "sem histórico"}</span>
                </div>
              </div>
              <div style={styles.deltaRow}>
                <span>Diferença observada</span>
                <strong style={{ color: priceDelta === null ? colors.textMuted : priceDelta >= 0 ? colors.success : colors.danger }}>
                  {priceDelta === null ? "Não comparável" : `${priceDelta >= 0 ? "+" : "−"}${formatCurrency(Math.abs(priceDelta))}`}
                </strong>
              </div>
              <p style={styles.panelText}>A comparação é apenas informativa: o motor deve usar a fonte definida para cada ativo e a data de referência da estratégia.</p>
            </section>
          </div>
        ) : null}
      </Screen>
    </AuthGuard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={styles.metric}><span style={styles.metricLabel}>{label}</span><strong style={styles.metricValue}>{value}</strong></div>;
}

const styles: Record<string, React.CSSProperties> = {
  statusStrip: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: layout.space.md, backgroundColor: colors.accentPanel, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  statusCopy: { display: "flex", flexDirection: "column", gap: 5 },
  statusTitle: { fontSize: 16, lineHeight: "22px" },
  statusText: { color: colors.textMuted, fontSize: 13, lineHeight: "18px" },
  statusPill: { fontFamily: typography.mono, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  sectionLabel: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" as const },
  errorPanel: { display: "flex", flexDirection: "column", gap: 6, padding: layout.space.md, backgroundColor: colors.accentPanel, border: `1px solid ${colors.danger}`, borderRadius: layout.radius.md },
  errorTitle: { color: colors.danger, fontFamily: typography.mono, fontSize: 13 },
  errorText: { color: colors.textMuted, fontSize: 12, lineHeight: "18px" },
  commandPanel: { display: "flex", flexDirection: "column", gap: layout.space.sm, padding: layout.space.md, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  panelHeading: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
  panelTitle: { color: colors.text, fontSize: 18, lineHeight: "24px", margin: "5px 0 0" },
  panelText: { color: colors.textMuted, fontSize: 13, lineHeight: "19px", margin: 0 },
  commandLabel: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" as const },
  command: { display: "block", overflowX: "auto", padding: layout.space.sm, backgroundColor: colors.background, color: colors.accentCyan, fontFamily: typography.mono, fontSize: 11, lineHeight: "18px", whiteSpace: "pre-wrap", wordBreak: "break-word", border: `1px solid ${colors.border}`, borderRadius: layout.radius.sm },
  commandNote: { display: "flex", alignItems: "flex-start", gap: 8, color: colors.textSoft, fontSize: 12, lineHeight: "18px" },
  noteMark: { color: colors.warning, fontFamily: typography.mono, fontWeight: 700 },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" },
  toolbarText: { display: "block", color: colors.textMuted, fontSize: 13, marginTop: 5 },
  selectLabel: { display: "flex", alignItems: "center", gap: 8, color: colors.textMuted, fontFamily: typography.mono, fontSize: 11 },
  select: { minHeight: layout.touch.minimum, padding: "0 28px 0 8px", color: colors.text, backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: layout.radius.sm, fontFamily: typography.mono, fontSize: 12 },
  emptyPanel: { display: "flex", flexDirection: "column", gap: 8, padding: layout.space.xl, backgroundColor: colors.accentPanel, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  emptyTitle: { color: colors.text, fontFamily: typography.mono, fontSize: 14 },
  emptyText: { color: colors.textMuted, fontSize: 13, lineHeight: "19px" },
  contentGrid: { display: "flex", alignItems: "stretch", gap: layout.space.md, flexWrap: "wrap" },
  snapshotPanel: { flex: "1 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: layout.space.md, padding: layout.space.md, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  comparisonPanel: { flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: layout.space.md, padding: layout.space.md, backgroundColor: colors.accentPanel, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  heroValueBlock: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  heroLabel: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 10 },
  heroValue: { color: colors.success, fontFamily: typography.mono, fontSize: 24, whiteSpace: "nowrap" },
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 1, backgroundColor: colors.border, border: `1px solid ${colors.border}` },
  metric: { display: "flex", flexDirection: "column", gap: 5, padding: layout.space.sm, backgroundColor: colors.surfaceAlt },
  metricLabel: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 10 },
  metricValue: { color: colors.text, fontFamily: typography.mono, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  sourceRow: { display: "flex", alignItems: "stretch", gap: layout.space.md, flexWrap: "wrap" },
  sourceLabel: { display: "block", color: colors.textSoft, fontFamily: typography.mono, fontSize: 10, marginBottom: 5 },
  sourceValue: { display: "block", color: colors.text, fontFamily: typography.mono, fontSize: 18 },
  sourceMeta: { display: "block", color: colors.textMuted, fontSize: 11, lineHeight: "16px", marginTop: 5 },
  sourceDivider: { width: 1, backgroundColor: colors.border },
  deltaRow: { display: "flex", justifyContent: "space-between", gap: 12, paddingTop: layout.space.md, borderTop: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: 12 },
};
