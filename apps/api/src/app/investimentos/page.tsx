"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/AuthGuard";
import { InlineAlert } from "@/components/InlineAlert";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RebalanceDecisionCard } from "@/components/RebalanceDecisionCard";
import { Screen } from "@/components/Screen";
import { SummaryCard } from "@/components/SummaryCard";
import {
  usePluggyMigrationReadiness,
  usePluggyProjection,
  usePluggyRebalancePreview,
  usePortfolioSummary,
} from "@/context/AuthContext";
import { formatCurrency, formatDateTime, formatPercentage } from "@/lib/formatters";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

const freshnessLabel: Record<string, string> = {
  FRESH: "Dados atualizados",
  STALE: "Dados desatualizados",
  UNAVAILABLE: "Sem sincronização disponível",
};

const mappingLabel: Record<string, string> = {
  MAPEADO: "Mapeado",
  SUGERIDO: "Candidato",
  PENDENTE: "Revisão necessária",
  FORA_DA_ESTRATEGIA: "Fora da estratégia",
};

const mappingDescription: Record<string, string> = {
  MAPEADO: "Entra no cálculo da cesta ativa.",
  SUGERIDO: "Candidato encontrado; aguarda aprovação.",
  PENDENTE: "Ainda não há uma decisão estratégica.",
  FORA_DA_ESTRATEGIA: "Permanece no patrimônio, mas não entra no cálculo.",
};

export default function InvestimentosPage() {
  const router = useRouter();
  const portfolio = usePortfolioSummary();
  const projection = usePluggyProjection();
  const [cashForOrdersDraft, setCashForOrdersDraft] = useState("");
  const [appliedCashForOrders, setAppliedCashForOrders] = useState<number | null>(null);
  const [cashInputNotice, setCashInputNotice] = useState<string | null>(null);
  const [lastQuoteRefreshAt, setLastQuoteRefreshAt] = useState<Date | null>(null);
  const rebalance = usePluggyRebalancePreview(appliedCashForOrders ?? undefined);
  const refetchRebalance = rebalance.refetch;
  const readiness = usePluggyMigrationReadiness();

  const summary = portfolio.data;
  const projectionData = projection.data;
  const plan = rebalance.data;
  const investments = projectionData?.investments ?? [];
  const actions = plan?.actions ?? [];
  const totalObserved = summary?.totalValue ?? 0;
  const investedValue = plan?.investedValue ?? summary?.positionsValue ?? 0;
  const cashAvailable = plan?.cashAvailable ?? 0;
  const cashForOrders = plan?.cashForOrders ?? cashAvailable;
  const cashHeldInReserve = plan?.cashHeldInReserve ?? Math.max(0, cashAvailable - cashForOrders);
  const coverage = plan?.mappingCoveragePercentage ?? null;
  const pendingReviewCount = (projectionData?.totals?.pendingCount ?? 0) + (projectionData?.totals?.suggestedCount ?? 0);
  const hasError = portfolio.error || projection.error || rebalance.error || readiness.error;

  useEffect(() => {
    if (plan && cashForOrdersDraft === "") {
      setCashForOrdersDraft(cashForOrders.toFixed(2));
    }
  }, [cashForOrders, cashForOrdersDraft, plan]);

  useEffect(() => {
    if (appliedCashForOrders !== null) void refetchRebalance();
  }, [appliedCashForOrders, refetchRebalance]);

  useEffect(() => {
    let isMounted = true;

    async function refreshRebalanceFromQuotes() {
      if (document.visibilityState === "hidden") return;
      await refetchRebalance();
      if (isMounted) setLastQuoteRefreshAt(new Date());
    }

    const intervalId = window.setInterval(refreshRebalanceFromQuotes, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [refetchRebalance]);

  function applyCashForOrders() {
    const parsed = Number(cashForOrdersDraft.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      setCashInputNotice("Informe um valor numérico para calcular a prévia.");
      return;
    }
    const normalized = Math.round(Math.min(cashAvailable, Math.max(0, parsed)) * 100) / 100;
    setCashForOrdersDraft(normalized.toFixed(2));
    setAppliedCashForOrders(normalized);
    setCashInputNotice(parsed > cashAvailable ? "O valor foi limitado ao caixa observado disponível." : parsed < 0 ? "Valores negativos foram ajustados para zero." : null);
  }

  return (
    <AuthGuard>
      <Screen
        title="Investimentos"
        subtitle="Veja a carteira observada pelo Pluggy e o próximo passo da Paridade de Risco."
        action={<PrimaryButton label="Revisar dados Pluggy" tone="neutral" onPress={() => router.push("/pluggy")} />}
      >
        {portfolio.error ? <InlineAlert title="Erro no resumo da carteira" message={portfolio.error} tone="danger" /> : null}
        {projection.error ? <InlineAlert title="Erro nos investimentos Pluggy" message={projection.error} tone="danger" /> : null}
        {rebalance.error ? <InlineAlert title="Erro no plano de rebalanceamento" message={rebalance.error} tone="danger" /> : null}
        {readiness.error ? <InlineAlert title="Erro no gate Pluggy" message={readiness.error} tone="danger" /> : null}

        {projectionData?.freshness ? (
          <div style={styles.freshness}>
            <div>
              <div style={styles.sectionLabel}>// FRESCOR_DA_CARTEIRA</div>
              <div style={{ ...styles.freshnessTitle, color: projectionData.freshness.status === "FRESH" ? colors.success : colors.warning }}>
                {freshnessLabel[projectionData.freshness.status] ?? projectionData.freshness.status}
              </div>
            </div>
            <div style={styles.freshnessMeta}>
              <span>Última sincronização: {projectionData.freshness.latestSyncAt ? formatDateTime(projectionData.freshness.latestSyncAt) : "nunca"}</span>
              {projectionData.freshness.ageMinutes !== null ? <span>Idade: {Math.round(projectionData.freshness.ageMinutes)} min</span> : null}
            </div>
            <span style={styles.sourceBadge}>{readiness.data?.currentMode === "PLUGGY" ? "FONTE PLUGGY ATIVA" : "FONTE PLUGGY"}</span>
          </div>
        ) : null}

        <div style={styles.metricsGrid}>
          <SummaryCard eyebrow="PATRIMÔNIO_OBSERVADO" title={formatCurrency(totalObserved)} detail="Investimentos, caixa e posições observadas" tone={totalObserved > 0 ? "success" : "default"} />
          <SummaryCard eyebrow="INVESTIDO_NA_ESTRATÉGIA" title={formatCurrency(investedValue)} detail="Base usada pelo motor de risco" tone={investedValue > 0 ? "success" : "default"} />
          <SummaryCard eyebrow="COBERTURA_DA_ANÁLISE" title={coverage == null ? "—" : formatPercentage(coverage)} detail="Parte dos investimentos considerada pela estratégia" tone={coverage === 100 ? "success" : "warning"} />
          <SummaryCard eyebrow="CAIXA_PARA_ORDENS" title={formatCurrency(cashForOrders)} detail="Aporte definido para a prévia" tone={cashForOrders > 0 ? "success" : "default"} />
        </div>

        {plan ? (
          <section style={styles.cashPlanner}>
            <div>
              <div style={styles.sectionLabel}>// APORTE_PLANEJADO</div>
              <div style={styles.sectionTitle}>Quanto você pretende investir agora?</div>
              <div style={styles.guideDetail}>O motor recalcula a carteira usando o valor escolhido. Esse valor é apenas uma simulação e não altera o saldo Pluggy.</div>
            </div>
            <div style={styles.cashPlannerControls}>
              <label htmlFor="cash-for-orders" style={styles.cashInputLabel}>Caixa para ordens</label>
              <input
                id="cash-for-orders"
                aria-describedby="cash-for-orders-help"
                inputMode="decimal"
                type="text"
                value={cashForOrdersDraft}
                onChange={(event) => setCashForOrdersDraft(event.target.value)}
                style={styles.cashInput}
              />
              <PrimaryButton label="Aplicar no cálculo" tone="neutral" onPress={applyCashForOrders} />
            </div>
            <div id="cash-for-orders-help" style={styles.cashPlannerMeta}>
              <span>Caixa observado: {formatCurrency(cashAvailable)}</span>
              <span>Reserva mantida: {formatCurrency(cashHeldInReserve)}</span>
              <span>Limite máximo: {formatCurrency(cashAvailable)}</span>
            </div>
            {cashInputNotice ? <div style={styles.cashInputNotice}>{cashInputNotice}</div> : null}
          </section>
        ) : null}

        {plan ? (
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <div style={styles.sectionLabel}>// DECISÃO_DE_INVESTIMENTO</div>
                <div style={styles.sectionTitle}>Decisão do motor e plano de ajuste</div>
              </div>
              <span style={styles.readOnly}>Somente leitura</span>
            </div>
            {plan.analysisStatus === "PARCIAL" ? (
              <InlineAlert title="Análise parcial" message="Existem investimentos sem decisão estratégica. O plano abaixo é indicativo até que todos sejam mapeados ou classificados fora da estratégia." tone="warning" />
            ) : null}
            {!plan.executionReady ? (
              <InlineAlert title="Plano ainda não liberado" message={plan.warnings?.join(" | ") || "Revise os dados pendentes antes de considerar o plano."} tone="warning" />
            ) : null}
            <RebalanceDecisionCard data={plan} isLoading={rebalance.isLoading} error={rebalance.error} showActions={false} showMetrics />
            {actions.length > 0 ? (
              <div style={styles.actionTable}>
                <div style={styles.sectionLabel}>// PLANO_DE_AJUSTE_ATÉ_A_CESTA</div>
                <div style={styles.actionHint}>Detalhamento das ordens estimadas: posição atual, alvo, valor financeiro e quantidade aproximada de cotas.</div>
                <div style={styles.actionLiveMeta}>
                  O cálculo usa o último preço BTG disponível e é atualizado automaticamente a cada 5 segundos
                  {lastQuoteRefreshAt ? ` · última consulta ${formatDateTime(lastQuoteRefreshAt.toISOString())}` : ""}.
                </div>
                {actions.map((action: any) => (
                  <div key={action.id} style={styles.actionRow}>
                    <span style={styles.actionTicker}>{action.ticker}</span>
                    <span style={{ ...styles.actionType, color: action.action === "APORTAR" ? colors.success : colors.warning }}>{action.action === "APORTAR" ? "Comprar" : "Reduzir"}</span>
                    <span style={styles.actionPercent}>{formatPercentage(action.currentPercentage)} → {formatPercentage(action.targetPercentage)}</span>
                    <span style={styles.actionQuantity}>{formatEstimatedQuantity(action.estimatedQuantity)}</span>
                    <span style={styles.actionAmount}>{formatCurrency(action.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>A carteira não possui ordens calculadas para a cesta ativa.</div>
            )}
          </section>
        ) : null}

        {plan && (pendingReviewCount > 0 || (coverage !== null && coverage < 100)) ? (
          <section style={styles.coverageGuide}>
            <div>
              <div style={styles.sectionLabel}>// COMO_LER_A_COBERTURA</div>
              <div style={styles.guideTitle}>{coverage === null ? "Cobertura ainda não calculada." : `${formatPercentage(coverage)} da carteira observada está sendo usada pelo motor.`}</div>
              <div style={styles.guideDetail}>Posições pendentes não entram nas ordens até receberem uma decisão. Posições fora da estratégia continuam visíveis no patrimônio, mas ficam fora da cesta.</div>
            </div>
            {pendingReviewCount > 0 ? <PrimaryButton label="Resolver pendências" tone="neutral" onPress={() => router.push("/pluggy")} /> : null}
          </section>
        ) : null}

        {projectionData?.totals ? (
          <div style={styles.metricsGrid}>
            <SummaryCard eyebrow="MAPEADOS" title={String(projectionData.totals.mappedCount)} detail="Vínculos estratégicos aprovados" tone="success" />
            <SummaryCard eyebrow="PENDENTES" title={String(projectionData.totals.pendingCount + projectionData.totals.suggestedCount)} detail="Precisam de revisão na tela Pluggy" tone={projectionData.totals.pendingCount > 0 ? "warning" : "default"} />
            <SummaryCard eyebrow="FORA_DA_ESTRATÉGIA" title={formatCurrency(plan?.outsideStrategyValue ?? summary?.outsideStrategyValue ?? 0)} detail="Patrimônio observado, fora da cesta" />
            <SummaryCard eyebrow="CUSTO_MÉDIO" title={String(projectionData.totals.missingCostBasisCount)} detail="Posições sem custo médio informado" tone={projectionData.totals.missingCostBasisCount > 0 ? "warning" : "default"} />
          </div>
        ) : null}

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionLabel}>// POSIÇÕES_OBSERVADAS</div>
              <div style={styles.sectionTitle}>O que está vindo das instituições conectadas</div>
            </div>
            <PrimaryButton label="Revisar mapeamentos" tone="neutral" onPress={() => router.push("/pluggy")} />
          </div>
          {projection.isLoading ? <div style={styles.emptyState}>Carregando investimentos Pluggy...</div> : null}
          {!projection.isLoading && investments.length === 0 ? <div style={styles.emptyState}>Nenhum investimento Pluggy sincronizado.</div> : null}
          {investments.length > 0 ? (
            <div style={styles.positionList}>
              {investments.map((investment: any) => {
                const status = investment.classification?.mappingStatus ?? "PENDENTE";
                return (
                  <div key={investment.id} style={styles.positionCard}>
                    <div style={styles.positionHeader}>
                      <div style={styles.positionName}>{investment.mappingCandidate?.ticker ?? investment.code ?? investment.name}</div>
                      <span style={{ ...styles.status, color: status === "MAPEADO" ? colors.success : status === "FORA_DA_ESTRATEGIA" ? colors.textMuted : colors.warning }}>{mappingLabel[status] ?? status}</span>
                    </div>
                    <div style={styles.positionMeta}>{investment.name} · {investment.type ?? "Tipo não informado"}</div>
                    <div style={styles.positionDecision}>{mappingDescription[status] ?? "Revisão estratégica necessária."}</div>
                    <div style={styles.positionValue}>{formatCurrency(investment.currentValue)}</div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        {!hasError && !projection.isLoading && !plan ? <div style={styles.emptyState}>A carteira Pluggy ainda está carregando a primeira projeção.</div> : null}
      </Screen>
    </AuthGuard>
  );
}

function formatEstimatedQuantity(quantity: number | null) {
  if (quantity === null) return "Qtd. —";
  return `≈ ${quantity.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} cotas`;
}

const styles: Record<string, React.CSSProperties> = {
  metricsGrid: { display: "flex", gap: layout.space.md, flexWrap: "wrap" },
  cashPlanner: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 360px)", gap: layout.space.md, alignItems: "end", padding: layout.space.lg, backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  cashPlannerControls: { display: "flex", flexDirection: "column", gap: layout.space.sm },
  cashInputLabel: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 11 },
  cashInput: { backgroundColor: colors.accentPanel, border: `1px solid ${colors.border}`, borderRadius: layout.radius.sm, color: colors.text, minHeight: 44, padding: "0 12px", fontFamily: typography.mono, fontSize: 14, width: "100%", boxSizing: "border-box" },
  cashPlannerMeta: { gridColumn: "1 / -1", display: "flex", gap: layout.space.md, flexWrap: "wrap", color: colors.textMuted, fontFamily: typography.mono, fontSize: 11 },
  cashInputNotice: { gridColumn: "1 / -1", color: colors.warning, fontSize: 12 },
  section: { display: "flex", flexDirection: "column", gap: layout.space.md },
  sectionHeader: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "flex-start", flexWrap: "wrap" },
  sectionLabel: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.8 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: 700, marginTop: 5 },
  readOnly: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 11 },
  freshness: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "center", flexWrap: "wrap", padding: layout.space.md, backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  freshnessTitle: { fontSize: 14, fontWeight: 700, marginTop: 4 },
  freshnessMeta: { display: "flex", flexDirection: "column", gap: 4, color: colors.textMuted, fontFamily: typography.mono, fontSize: 11 },
  sourceBadge: { color: colors.success, fontFamily: typography.mono, fontSize: 11, fontWeight: 700 },
  actionTable: { display: "flex", flexDirection: "column", gap: 7, padding: layout.space.md, backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  actionHint: { color: colors.textMuted, fontSize: 12, lineHeight: 1.45, marginBottom: 0 },
  actionLiveMeta: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 10, lineHeight: "16px", marginBottom: 3 },
  actionRow: { display: "flex", gap: layout.space.sm, alignItems: "center", flexWrap: "wrap", fontFamily: typography.mono, fontSize: 12 },
  actionTicker: { color: colors.text, fontWeight: 700, minWidth: 58 },
  actionType: { minWidth: 58 },
  actionPercent: { color: colors.textMuted },
  actionQuantity: { color: colors.textMuted, minWidth: 92 },
  actionAmount: { color: colors.text, fontWeight: 700, marginLeft: "auto" },
  coverageGuide: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "center", flexWrap: "wrap", padding: layout.space.lg, backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  guideTitle: { color: colors.text, fontSize: 15, fontWeight: 700, marginTop: 5 },
  guideDetail: { color: colors.textMuted, fontSize: 12, lineHeight: "18px", marginTop: 6, maxWidth: 760 },
  positionList: { display: "flex", flexDirection: "column", gap: layout.space.sm },
  positionCard: { display: "flex", flexDirection: "column", gap: 5, padding: layout.space.md, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  positionHeader: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "center" },
  positionName: { color: colors.text, fontFamily: typography.mono, fontSize: 14, fontWeight: 700 },
  positionMeta: { color: colors.textMuted, fontSize: 12 },
  positionDecision: { color: colors.textSoft, fontSize: 11, lineHeight: "16px" },
  positionValue: { color: colors.text, fontFamily: typography.mono, fontSize: 15, fontWeight: 700, marginTop: 5 },
  status: { fontFamily: typography.mono, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  emptyState: { color: colors.textMuted, padding: layout.space.xl, textAlign: "center" },
};
