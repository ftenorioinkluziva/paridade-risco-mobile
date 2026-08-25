"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/AuthGuard";
import { InlineAlert } from "@/components/InlineAlert";
import { PrimaryButton } from "@/components/PrimaryButton";
import { RebalanceDecisionCard } from "@/components/RebalanceDecisionCard";
import { ContentState } from "@/components/ResponsivePrimitives";
import { Screen } from "@/components/Screen";
import { SummaryCard } from "@/components/SummaryCard";
import {
  usePluggySourceActivationReadiness,
  usePluggyProjection,
  usePluggyRebalancePreview,
  usePortfolioSummary,
} from "@/context/AuthContext";
import { formatCurrency, formatDateTime, formatPercentage } from "@/lib/formatters";
import { buildInvestmentPlanGuidance, initialContributionMessage } from "@/lib/investment-plan-guidance";
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
  const readiness = usePluggySourceActivationReadiness();

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
  const freshnessStatus = projectionData?.freshness?.status;
  const freshnessTone = freshnessStatus === "FRESH" ? colors.success : colors.warning;
  const freshnessSourceLabel = freshnessStatus === "FRESH"
    ? "DADOS PRONTOS PARA ANÁLISE"
    : freshnessStatus === "STALE"
      ? "REVISAR SINCRONIZAÇÃO"
      : "SINCRONIZAÇÃO NECESSÁRIA";
  const planGuidance = plan
    ? buildInvestmentPlanGuidance({
      executionReady: plan.executionReady,
      eligibleForRebalance: plan.eligibleForRebalance,
      missingProfileFields: plan.missingProfileFields,
      freshness: plan.freshness,
      warnings: plan.warnings,
      targetBasketName: plan.targetBasketName,
      investedValue,
      cashForOrders,
      unresolvedCount: plan.unresolvedCount,
      analysisStatus: plan.analysisStatus,
      pendingReviewCount,
    })
    : { blockers: [], showInitialContribution: false };

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
        pageId="investimentos"
        width="wide"
        title="Investimentos"
        subtitle="Veja a carteira observada e o próximo passo da Paridade de Risco."
        action={<PrimaryButton label="Revisar dados sincronizados" tone="neutral" onPress={() => router.push("/pluggy")} />}
      >
        {portfolio.error ? <InlineAlert title="Erro no resumo da carteira" message={portfolio.error} tone="danger" /> : null}
        {projection.error ? <InlineAlert title="Erro nos investimentos sincronizados" message={projection.error} tone="danger" /> : null}
        {rebalance.error ? <InlineAlert title="Erro no plano de rebalanceamento" message={rebalance.error} tone="danger" /> : null}
        {readiness.error ? <InlineAlert title="Erro na validação dos dados" message={readiness.error} tone="danger" /> : null}

        {projectionData?.freshness ? (
          <div
            style={{ ...styles.freshness, borderColor: freshnessTone }}
            role="status"
            aria-live="polite"
            aria-label={`Estado dos dados: ${freshnessLabel[freshnessStatus] ?? freshnessStatus}`}
            data-freshness={freshnessStatus}
          >
            <div>
              <div style={styles.sectionLabel}>// FRESCOR_DA_CARTEIRA</div>
              <div style={{ ...styles.freshnessTitle, color: freshnessTone }}>
                {freshnessLabel[projectionData.freshness.status] ?? projectionData.freshness.status}
              </div>
            </div>
            <div style={styles.freshnessMeta}>
              <span>Última sincronização: {projectionData.freshness.latestSyncAt ? formatDateTime(projectionData.freshness.latestSyncAt) : "nunca"}</span>
              {projectionData.freshness.ageMinutes !== null ? <span>Idade: {Math.round(projectionData.freshness.ageMinutes)} min</span> : null}
            </div>
            <span style={{ ...styles.sourceBadge, color: freshnessTone }}>{freshnessSourceLabel}</span>
          </div>
        ) : null}

        <div className="investment-metrics-grid" style={styles.metricsGrid}>
          <SummaryCard eyebrow="PATRIMÔNIO_OBSERVADO" title={formatCurrency(totalObserved)} detail="Investimentos, caixa e posições observadas" tone={totalObserved > 0 ? "success" : "default"} />
          <SummaryCard eyebrow="INVESTIDO_NA_ESTRATÉGIA" title={formatCurrency(investedValue)} detail="Base usada pelo motor de risco" tone={investedValue > 0 ? "success" : "default"} />
          <SummaryCard eyebrow="COBERTURA_DA_ANÁLISE" title={coverage == null ? "—" : formatPercentage(coverage)} detail="Parte dos investimentos considerada pela estratégia" tone={coverage === 100 ? "success" : "warning"} />
          <SummaryCard eyebrow="CAIXA_PARA_ORDENS" title={formatCurrency(cashForOrders)} detail="Aporte definido para a prévia" tone={cashForOrders > 0 ? "success" : "default"} />
        </div>

        {plan ? (
          <section className="investment-cash-planner" style={styles.cashPlanner} aria-labelledby="planned-investment-title">
            <div>
              <div style={styles.sectionLabel}>// APORTE_PLANEJADO</div>
              <h2 id="planned-investment-title" style={styles.sectionTitle}>Quanto você pretende investir agora?</h2>
              <div style={styles.guideDetail}>O motor recalcula a carteira usando o valor escolhido. Esse valor é apenas uma simulação e não altera o saldo observado.</div>
            </div>
            <div className="investment-cash-controls" style={styles.cashPlannerControls}>
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
            <div className="investment-cash-meta" id="cash-for-orders-help" style={styles.cashPlannerMeta}>
              <span>Caixa observado: {formatCurrency(cashAvailable)}</span>
              <span>Reserva mantida: {formatCurrency(cashHeldInReserve)}</span>
              <span>Limite máximo: {formatCurrency(cashAvailable)}</span>
            </div>
            {cashInputNotice ? <div style={styles.cashInputNotice}>{cashInputNotice}</div> : null}
          </section>
        ) : null}

        {plan ? (
          <section style={styles.section} aria-labelledby="investment-decision-title">
            <div style={styles.sectionHeader}>
              <div>
                <div style={styles.sectionLabel}>// DECISÃO_DE_INVESTIMENTO</div>
                <h2 id="investment-decision-title" style={styles.sectionTitle}>Decisão do motor e plano de ajuste</h2>
              </div>
              <span style={styles.readOnly}>Somente leitura</span>
            </div>
            {planGuidance.blockers.length > 0 || planGuidance.showInitialContribution ? (
              <section style={styles.guidanceSection} aria-label="Orientações da prévia de investimentos">
                {planGuidance.blockers.length > 0 ? (
                  <div style={styles.guidanceHeader}>
                    <div style={styles.sectionLabel}>// PRÓXIMO_PASSO</div>
                    <h3 style={styles.guidanceTitle}>Resolva os itens abaixo para liberar as sugestões.</h3>
                  </div>
                ) : null}
                <div style={styles.guidanceList}>
                  {planGuidance.blockers.map((blocker) => (
                    <InlineAlert
                      key={blocker.id}
                      title={blocker.title}
                      message={blocker.message}
                      actionLabel={blocker.actionLabel}
                      onAction={() => router.push(blocker.href)}
                      tone="warning"
                    />
                  ))}
                  {planGuidance.showInitialContribution ? (
                    <InlineAlert title="Aporte inicial em simulação" message={initialContributionMessage} tone="warning" />
                  ) : null}
                </div>
              </section>
            ) : null}
            <RebalanceDecisionCard data={plan} isLoading={rebalance.isLoading} error={rebalance.error} showActions={false} showMetrics />
            {actions.length > 0 ? (
              <div className="investment-action-table" style={styles.actionTable}>
                <div style={styles.sectionLabel}>// PLANO_DE_AJUSTE_ATÉ_A_CESTA</div>
                <div style={styles.actionHint}>Detalhamento das ordens estimadas: posição atual, alvo, valor financeiro e quantidade aproximada de cotas.</div>
                <div style={styles.actionLiveMeta}>
                  O cálculo usa o último preço disponível e é atualizado automaticamente a cada 5 segundos
                  {lastQuoteRefreshAt ? ` · última consulta ${formatDateTime(lastQuoteRefreshAt.toISOString())}` : ""}.
                </div>
                {actions.map((action: any) => (
                  <div className="investment-action-row" key={action.id} style={styles.actionRow}>
                    <span style={styles.actionTicker}>{action.ticker}</span>
                    <span style={{ ...styles.actionType, color: action.action === "APORTAR" ? colors.success : colors.warning }}>{action.action === "APORTAR" ? "Comprar" : "Reduzir"}</span>
                    <span style={styles.actionPercent}>{formatPercentage(action.currentPercentage)} → {formatPercentage(action.targetPercentage)}</span>
                    <span style={styles.actionQuantity}>{formatEstimatedQuantity(action.estimatedQuantity)}</span>
                    <span className="investment-action-amount" style={styles.actionAmount}>{formatCurrency(action.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <ContentState
                title={planGuidance.blockers.length > 0 ? "Sugestões aguardando dados" : planGuidance.showInitialContribution ? "Prévia do primeiro aporte" : "Nenhuma ordem calculada"}
                description={planGuidance.blockers.length > 0
                  ? "Resolva as orientações acima para liberar uma prévia segura da carteira."
                  : planGuidance.showInitialContribution
                    ? "A distribuição da cesta ativa será apresentada como simulação, sem executar ordens."
                    : "A carteira já está alinhada à cesta ativa ou ainda não há uma ação elegível para este recorte."}
                tone={planGuidance.blockers.length > 0 ? "warning" : "success"}
              />
            )}
          </section>
        ) : null}

        {plan && planGuidance.blockers.every((blocker) => blocker.id !== "mapping") && (pendingReviewCount > 0 || (coverage !== null && coverage < 100)) ? (
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
          <div className="investment-metrics-grid" style={styles.metricsGrid}>
            <SummaryCard eyebrow="MAPEADOS" title={String(projectionData.totals.mappedCount)} detail="Vínculos estratégicos aprovados" tone="success" />
            <SummaryCard eyebrow="PENDENTES" title={String(projectionData.totals.pendingCount + projectionData.totals.suggestedCount)} detail="Precisam de revisão nos dados sincronizados" tone={projectionData.totals.pendingCount > 0 ? "warning" : "default"} />
            <SummaryCard eyebrow="FORA_DA_ESTRATÉGIA" title={formatCurrency(plan?.outsideStrategyValue ?? summary?.outsideStrategyValue ?? 0)} detail="Patrimônio observado, fora da cesta" />
            <SummaryCard eyebrow="CUSTO_MÉDIO" title={String(projectionData.totals.missingCostBasisCount)} detail="Posições sem custo médio informado" tone={projectionData.totals.missingCostBasisCount > 0 ? "warning" : "default"} />
          </div>
        ) : null}

        <section style={styles.section} aria-labelledby="observed-positions-title">
          <div style={styles.sectionHeader}>
            <div>
              <div style={styles.sectionLabel}>// POSIÇÕES_OBSERVADAS</div>
              <h2 id="observed-positions-title" style={styles.sectionTitle}>O que está vindo das instituições conectadas</h2>
            </div>
            <PrimaryButton label="Revisar mapeamentos" tone="neutral" onPress={() => router.push("/pluggy")} />
          </div>
          {projection.isLoading ? (
            <ContentState title="Carregando posições" description="Atualizando os dados observados para manter a decisão no contexto mais recente." tone="loading" />
          ) : null}
          {!projection.isLoading && investments.length === 0 ? (
            <ContentState title="Nenhum investimento sincronizado" description="Conecte uma fonte de dados ou atualize a sincronização para consultar posições nesta tela." />
          ) : null}
          {investments.length > 0 ? (
            <div className="investment-position-list" style={styles.positionList}>
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

        {!hasError && !projection.isLoading && !plan ? (
          <ContentState title="Calculando a primeira projeção" description="A posição observada foi recebida; o plano de ajuste aparecerá assim que o cálculo terminar." tone="loading" />
        ) : null}
      </Screen>
    </AuthGuard>
  );
}

function formatEstimatedQuantity(quantity: number | null) {
  if (quantity === null) return "Qtd. —";
  return `≈ ${quantity.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} cotas`;
}

const styles: Record<string, React.CSSProperties> = {
  metricsGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: layout.space.md },
  cashPlanner: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 360px)", gap: layout.space.md, alignItems: "end", padding: layout.space.lg, backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  cashPlannerControls: { display: "flex", flexDirection: "column", gap: layout.space.sm },
  cashInputLabel: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 11 },
  cashInput: { backgroundColor: colors.accentPanel, border: `1px solid ${colors.border}`, borderRadius: layout.radius.sm, color: colors.text, minHeight: 44, padding: "0 12px", fontFamily: typography.mono, fontSize: 14, width: "100%", boxSizing: "border-box" },
  cashPlannerMeta: { gridColumn: "1 / -1", display: "flex", gap: layout.space.md, flexWrap: "wrap", color: colors.textMuted, fontFamily: typography.mono, fontSize: 11 },
  cashInputNotice: { gridColumn: "1 / -1", color: colors.warning, fontSize: 12 },
  section: { display: "flex", flexDirection: "column", gap: layout.space.md },
  sectionHeader: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "flex-start", flexWrap: "wrap" },
  guidanceSection: { display: "flex", flexDirection: "column", gap: layout.space.md, padding: layout.space.md, backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  guidanceHeader: { display: "flex", flexDirection: "column", gap: layout.space.xs },
  guidanceTitle: { color: colors.text, fontSize: 15, fontWeight: 700, margin: 0 },
  guidanceList: { display: "flex", flexDirection: "column", gap: layout.space.sm },
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
