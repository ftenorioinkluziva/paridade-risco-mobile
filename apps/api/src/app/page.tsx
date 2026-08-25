"use client";

import Link from "next/link";

import { InlineAlert } from "@/components/InlineAlert";
import { LandingPage } from "@/components/LandingPage";
import { RebalanceDecisionCard } from "@/components/RebalanceDecisionCard";
import { Screen } from "@/components/Screen";
import { SummaryCard } from "@/components/SummaryCard";
import {
  useAuth,
  usePluggyFinancialHealth,
  usePluggyRebalancePreview,
  usePortfolioSummary,
} from "@/context/AuthContext";
import { formatCurrency, formatSignedCurrency } from "@/lib/formatters";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

function formatMonthLabel(month: string | undefined) {
  if (!month) return "mês não informado";
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return month;
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export default function OverviewPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <LandingPage />;

  return <OverviewContent />;
}

function OverviewContent() {
  const portfolio = usePortfolioSummary();
  const health = usePluggyFinancialHealth();
  const rebalance = usePluggyRebalancePreview();

  const summary = portfolio.data;
  const healthData = health.data;
  const financial = healthData?.financial;
  const rebalanceData = rebalance.data;
  const totalObserved = summary?.totalValue ?? 0;
  const investedValue = summary?.positionsValue ?? 0;
  const cashBalance = financial?.cash?.balance ?? summary?.cashBalance ?? 0;
  const cashAfterObligations = healthData?.indicators?.cashAfterUpcomingObligations ?? cashBalance;
  const currentMonthCashFlow = financial?.cashFlow?.currentMonth;
  const previousMonthCashFlow = financial?.cashFlow?.previousMonth;
  const alerts = healthData?.alerts ?? [];

  return (
    <Screen
      pageId="resumo"
      width="wide"
      title="Resumo"
      subtitle="Sua posição financeira, a saúde do caixa e a próxima decisão de investimento."
    >
      {portfolio.error ? <InlineAlert title="Erro no resumo da carteira" message={portfolio.error} tone="danger" /> : null}
      {health.error ? <InlineAlert title="Erro na saúde financeira" message={health.error} tone="danger" /> : null}
      {rebalance.error ? <InlineAlert title="Erro no rebalanceamento" message={rebalance.error} tone="danger" /> : null}

      <div className="summary-metrics-grid summary-primary-grid">
        <SummaryCard eyebrow="PATRIMÔNIO_OBSERVADO" title={formatCurrency(totalObserved)} detail="Investimentos, caixa e posições observadas" tone={totalObserved > 0 ? "success" : "default"} />
        <SummaryCard eyebrow="INVESTIDO" title={formatCurrency(investedValue)} detail="Carteira considerada pela estratégia" tone={investedValue > 0 ? "success" : "default"} />
      </div>

      <section className="summary-decision" style={styles.section} aria-labelledby="summary-decision-title">
        <div style={styles.sectionHeader}>
          <div>
            <div style={styles.sectionLabel}>// PRÓXIMA_DECISÃO</div>
            <h2 id="summary-decision-title" style={styles.sectionTitle}>O que fazer com a carteira agora</h2>
          </div>
        </div>
        <Link href="/investimentos" className="decision-card-link" aria-label="Abrir investimentos e ver a carteira completa">
          <RebalanceDecisionCard data={rebalanceData} isLoading={rebalance.isLoading} error={rebalance.error} compact showActions={false} showMetrics />
        </Link>
      </section>

      <div className="summary-metrics-grid summary-secondary-grid">
        <SummaryCard eyebrow="CAIXA_BANCÁRIO" title={formatCurrency(cashBalance)} detail="Saldo observado nas contas" tone={cashBalance > 0 ? "success" : "default"} />
        <SummaryCard eyebrow="OBRIGAÇÕES_PRÓXIMAS" title={formatCurrency(financial?.obligations?.upcomingTotal ?? 0)} detail="Cartões no horizonte de 30 dias" tone={(financial?.obligations?.upcomingTotal ?? 0) > 0 ? "warning" : "default"} />
        <SummaryCard eyebrow="APÓS_OBRIGAÇÕES" title={formatCurrency(cashAfterObligations)} detail="Caixa após cartões próximos" tone={cashAfterObligations >= 0 ? "success" : "warning"} />
        <SummaryCard eyebrow="FLUXO_LÍQUIDO_MÊS_ATUAL" title={formatSignedCurrency(currentMonthCashFlow?.net ?? 0)} detail={`${formatMonthLabel(currentMonthCashFlow?.month)} · receitas vs despesas`} tone={(currentMonthCashFlow?.net ?? 0) >= 0 ? "success" : "warning"} />
        <SummaryCard eyebrow="FLUXO_LÍQUIDO_MÊS_ANTERIOR" title={formatSignedCurrency(previousMonthCashFlow?.net ?? 0)} detail={`${formatMonthLabel(previousMonthCashFlow?.month)} · referência para investir`} tone={(previousMonthCashFlow?.net ?? 0) >= 0 ? "success" : "warning"} />
      </div>

      {alerts.length > 0 ? (
        <section style={styles.section} aria-labelledby="summary-alerts-title">
          <h2 id="summary-alerts-title" style={styles.sectionLabel}>// ALERTAS_QUE_MERECEM_ATENÇÃO</h2>
          <div style={styles.alertList}>
            {alerts.slice(0, 4).map((alert: any) => (
              <InlineAlert key={alert.code} title={`${alert.severity === "HIGH" ? "Prioridade alta" : "Atenção"} · ${alert.source}`} message={alert.message} tone={alert.severity === "HIGH" ? "danger" : "warning"} />
            ))}
          </div>
        </section>
      ) : null}

    </Screen>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { display: "flex", flexDirection: "column", gap: layout.space.md },
  sectionHeader: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "flex-start", flexWrap: "wrap" },
  sectionLabel: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.8 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: 700, marginTop: 5 },
  alertList: { display: "flex", flexDirection: "column", gap: layout.space.sm },
};
