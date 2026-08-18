"use client";

import { useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { InlineAlert } from "@/components/InlineAlert";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { usePluggyFinancialHealth, usePluggyFinancialOverview } from "@/context/AuthContext";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

const healthStatusLabel: Record<string, string> = {
  ESTAVEL: "Saúde estável",
  ATENCAO: "Atenção necessária",
  INCOMPLETA: "Dados incompletos",
};

const alertSeverityLabel: Record<string, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  INFO: "Informativa",
};

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "Não informado";
  return `${(value * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatNullableCurrency(value: number | null | undefined) {
  return value === null || value === undefined ? "Não calculado" : formatCurrency(value);
}

function statusColor(status: string) {
  if (status === "ESTAVEL" || status === "SUFICIENTE") return colors.success;
  if (status === "ATENCAO" || status === "PROXIMA" || status === "INCOMPLETA") return colors.warning;
  return colors.textMuted;
}

function alertPriority(severity: string) {
  return severity === "HIGH" ? 0 : severity === "MEDIUM" ? 1 : 2;
}

function formatInsightValue(value: number | null | undefined) {
  return value === null || value === undefined ? "Não informado" : formatCurrency(value);
}

function formatMonthLabel(month: string | undefined) {
  if (!month) return "mês não informado";
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return month;
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export default function FinancialHealthPage() {
  const overview = usePluggyFinancialOverview();
  const health = usePluggyFinancialHealth();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await Promise.all([overview.refetch(), health.refetch()]);
    setRefreshing(false);
  }

  const data = health.data;
  const financial = data?.financial;
  const alerts = data?.alerts ?? [];
  const cards = financial?.credit?.cards ?? [];
  const obligations = financial?.obligations?.items ?? [];
  const loans = data?.loans?.items ?? [];
  const orderedAlerts = [...alerts].sort((left: any, right: any) => alertPriority(left.severity) - alertPriority(right.severity));
  const nextObligation = [...obligations]
    .filter((item: any) => item.dueDate)
    .sort((left: any, right: any) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime())[0];
  const nextLoan = [...loans]
    .filter((item: any) => item.nextDueDate)
    .sort((left: any, right: any) => new Date(left.nextDueDate).getTime() - new Date(right.nextDueDate).getTime())[0];
  const nextCommitment = nextObligation
    ? { label: nextObligation.accountName, amount: nextObligation.amount, date: nextObligation.dueDate }
    : nextLoan
      ? { label: nextLoan.name ?? "Empréstimo", amount: nextLoan.installmentAmount, date: nextLoan.nextDueDate }
      : null;
  const hasUndatedCommitment = obligations.some((item: any) => !item.dueDate) || loans.some((item: any) => !item.nextDueDate);
  const dataQualityLabel = data?.healthStatus === "INCOMPLETA" || financial?.warnings?.length ? "Revisar dados" : "Dados em ordem";
  const dataQualityTone = dataQualityLabel === "Revisar dados" ? colors.warning : colors.success;
  const currentMonthCashFlow = financial?.cashFlow.currentMonth;
  const previousMonthCashFlow = financial?.cashFlow.previousMonth;

  return (
    <AuthGuard>
      <Screen
        title="Saúde financeira"
        subtitle="Entenda caixa, crédito, obrigações e dívidas observados na sua conta."
        action={<PrimaryButton label={refreshing ? "Atualizando..." : "Atualizar dados"} disabled={refreshing} onPress={refresh} tone="neutral" />}
      >
        {overview.error ? <InlineAlert title="Erro na visão financeira" message={overview.error} tone="danger" /> : null}
        {health.error ? <InlineAlert title="Erro na saúde financeira" message={health.error} tone="danger" /> : null}

        {health.isLoading || overview.isLoading ? <div style={styles.emptyState}>Carregando dados financeiros...</div> : null}

        {data && financial ? (
          <>
            <section style={styles.statusBanner}>
              <div>
                <div style={styles.sectionLabel}>// LEITURA_FINANCEIRA</div>
                <div style={{ ...styles.statusTitle, color: statusColor(data.healthStatus) }}>
                  {healthStatusLabel[data.healthStatus] ?? data.healthStatus}
                </div>
                <div style={styles.muted}>Dados observados: últimos {financial.period.days} dias · fluxo em meses-calendário</div>
              </div>
              <div style={styles.statusMeta}>
                <span>Fonte: {data.source}</span>
                <span>Atualizado: {formatDateTime(financial.generatedAt)}</span>
                <span>Última sincronização: {financial.freshness.latestSyncAt ? formatDateTime(financial.freshness.latestSyncAt) : "sem sincronização"}</span>
              </div>
            </section>

            <section style={styles.dailySection}>
              <div>
                <div style={styles.sectionLabel}>// LEITURA_DO_DIA</div>
                <div style={styles.sectionTitle}>O que merece atenção agora</div>
              </div>
              <div className="mobile-grid-3" style={styles.insightGrid}>
                <InsightCard
                  label="PRIORIDADE"
                  value={orderedAlerts[0] ? (alertSeverityLabel[orderedAlerts[0].severity] ?? orderedAlerts[0].severity) : "Nenhuma"}
                  detail={orderedAlerts[0]?.message ?? "Nenhum alerta relevante no período."}
                  tone={orderedAlerts[0]?.severity === "HIGH" ? colors.danger : orderedAlerts[0] ? colors.warning : colors.success}
                />
                <InsightCard
                  label="PRÓXIMO_COMPROMISSO"
                  value={nextCommitment ? formatInsightValue(nextCommitment.amount) : hasUndatedCommitment ? "Data não informada" : "Nenhum"}
                  detail={nextCommitment ? `${nextCommitment.label} · ${formatDate(nextCommitment.date)}` : hasUndatedCommitment ? "Há uma obrigação sem vencimento informado." : "Nenhuma obrigação com vencimento observado."}
                  tone={nextCommitment || hasUndatedCommitment ? colors.warning : colors.success}
                />
                <InsightCard
                  label="QUALIDADE_DOS_DADOS"
                  value={dataQualityLabel}
                  detail={financial.freshness.latestSyncAt ? `Última sincronização: ${formatDateTime(financial.freshness.latestSyncAt)}` : "Nenhuma sincronização confirmada."}
                  tone={dataQualityTone}
                />
              </div>
            </section>

            <section className="mobile-grid-4" style={styles.kpiGrid}>
              <MetricCard label="Caixa bancário" value={formatCurrency(financial.cash.balance)} hint="Não inclui limite de cartão" />
              <MetricCard label="Após obrigações" value={formatCurrency(data.indicators.cashAfterUpcomingObligations)} hint={`Horizonte: ${financial.obligations.horizonDays} dias`} tone={financial.liquidityStatus === "INSUFICIENTE" ? "danger" : "default"} />
              <MetricCard label="Fluxo líquido do mês atual" value={formatCurrency(currentMonthCashFlow?.net ?? data.indicators.cashFlowNet)} hint={`${formatMonthLabel(currentMonthCashFlow?.month)} · receitas vs despesas`} tone={(currentMonthCashFlow?.net ?? data.indicators.cashFlowNet) < 0 ? "danger" : "default"} />
              <MetricCard label="Fluxo líquido do mês anterior" value={formatCurrency(previousMonthCashFlow?.net ?? 0)} hint={`${formatMonthLabel(previousMonthCashFlow?.month)} · referência para investir`} tone={(previousMonthCashFlow?.net ?? 0) < 0 ? "danger" : "default"} />
            </section>

            <section className="mobile-columns-2" style={styles.columns}>
              <Panel title="// CARTÕES_E_CRÉDITO">
                {cards.length === 0 ? <div style={styles.muted}>Nenhum cartão sincronizado.</div> : cards.map((card: any) => (
                  <div key={card.id} style={styles.rowCard}>
                    <div style={styles.rowHeader}>
                      <strong style={styles.rowTitle}>{card.name}</strong>
                      <span style={{ ...styles.mono, color: statusColor(card.obligationStatus) }}>{card.obligationStatus}</span>
                    </div>
                    <div style={styles.detailGrid}>
                      <Detail label="Fatura" value={formatCurrency(card.balanceDue)} />
                      <Detail label="Utilização" value={formatPercent(card.creditUtilization)} />
                      <Detail label="Limite" value={formatNullableCurrency(card.creditLimit)} />
                      <Detail label="Vencimento" value={card.balanceDueDate ? formatDate(card.balanceDueDate) : "Sem data"} />
                    </div>
                  </div>
                ))}
              </Panel>

              <Panel title="// FLUXO_DO_MÊS_ATUAL">
                <div style={styles.detailGrid}>
                  <Detail label="Entradas" value={formatCurrency(currentMonthCashFlow?.income ?? 0)} />
                  <Detail label="Despesas bancárias" value={formatCurrency(currentMonthCashFlow?.bankExpenses ?? 0)} />
                  <Detail label="Gastos no cartão" value={formatCurrency(currentMonthCashFlow?.cardSpend ?? 0)} />
                  <Detail label="Pagamentos excluídos" value={formatCurrency(currentMonthCashFlow?.cardPaymentsExcluded ?? 0)} />
                </div>
                <div style={styles.explanation}>Pagamentos de cartão são separados dos gastos para evitar dupla contagem. O mês anterior indica o valor que efetivamente sobrou ou faltou como referência para investir.</div>
              </Panel>
            </section>

            <section className="mobile-columns-2" style={styles.columns}>
              <Panel title="// OBRIGAÇÕES_PRÓXIMAS">
                {obligations.length === 0 ? <div style={styles.muted}>Nenhuma obrigação observada no horizonte.</div> : obligations.map((obligation: any) => (
                  <div key={obligation.id} style={styles.rowCard}>
                    <div style={styles.rowHeader}>
                      <strong style={styles.rowTitle}>{obligation.accountName}</strong>
                      <span style={{ ...styles.mono, color: statusColor(obligation.status) }}>{obligation.status}</span>
                    </div>
                    <div style={styles.detailGrid}>
                      <Detail label="Valor" value={formatCurrency(obligation.amount)} />
                      <Detail label="Mínimo" value={formatNullableCurrency(obligation.minimumPayment)} />
                      <Detail label="Vencimento" value={obligation.dueDate ? formatDate(obligation.dueDate) : "Sem data"} />
                    </div>
                  </div>
                ))}
              </Panel>

              <Panel title="// EMPRÉSTIMOS">
                <div style={styles.loanSummary}>
                  <Detail label="Estado dos dados" value={data.loans.dataStatus} />
                  <Detail label="Saldo devedor" value={formatNullableCurrency(data.loans.totalOutstanding)} />
                  <Detail label="Parcelas" value={formatNullableCurrency(data.loans.totalInstallment)} />
                </div>
                {loans.length === 0 ? <div style={styles.muted}>Nenhum empréstimo observado.</div> : loans.map((loan: any) => (
                  <div key={loan.id} style={styles.rowCard}>
                    <div style={styles.rowHeader}>
                      <strong style={styles.rowTitle}>{loan.name ?? "Empréstimo"}</strong>
                      <span style={{ ...styles.mono, color: statusColor(loan.dataStatus) }}>{loan.dataStatus}</span>
                    </div>
                    <div style={styles.detailGrid}>
                      <Detail label="Contratado" value={formatNullableCurrency(loan.originalAmount)} />
                      <Detail label="Saldo" value={formatNullableCurrency(loan.outstandingBalance)} />
                      <Detail label="Parcela" value={formatNullableCurrency(loan.installmentAmount)} />
                      <Detail label="Vencimento" value={loan.nextDueDate ? formatDate(loan.nextDueDate) : loan.maturityDate ? `${formatDate(loan.maturityDate)} (contrato)` : "Sem data"} />
                    </div>
                    {loan.dataStatus === "INCOMPLETA" ? <div style={styles.explanation}>Não foram informados todos os campos necessários para calcular a parcela e o próximo vencimento. Os valores disponíveis continuam sendo exibidos.</div> : null}
                  </div>
                ))}
              </Panel>
            </section>

            <Panel title="// ALERTAS_EXPLICÁVEIS">
              {alerts.length === 0 ? <div style={styles.muted}>Nenhum alerta no período analisado.</div> : alerts.map((alert: any) => (
                <div key={alert.code} style={styles.alertRow}>
                  <span style={{ ...styles.mono, color: alert.severity === "HIGH" ? colors.danger : alert.severity === "MEDIUM" ? colors.warning : colors.primary }}>
                    {alertSeverityLabel[alert.severity] ?? alert.severity}
                  </span>
                  <div>
                    <strong style={styles.rowTitle}>{alert.message}</strong>
                    <div style={styles.muted}>{alert.code} · origem: {alert.source}</div>
                  </div>
                </div>
              ))}
            </Panel>

            {financial.warnings.length > 0 ? (
              <div style={styles.warnings}>
                {financial.warnings.map((warning: string) => <div key={warning}>• {warning}</div>)}
              </div>
            ) : null}
          </>
        ) : null}
      </Screen>
    </AuthGuard>
  );
}

function MetricCard({ label, value, hint, tone = "default" }: { label: string; value: string; hint: string; tone?: "default" | "danger" }) {
  return (
    <div style={styles.metricCard}>
      <span style={styles.sectionLabel}>{label}</span>
      <strong style={{ ...styles.metricValue, color: tone === "danger" ? colors.danger : colors.text }}>{value}</strong>
      <span style={styles.muted}>{hint}</span>
    </div>
  );
}

function InsightCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return (
    <div style={styles.insightCard}>
      <span style={styles.sectionLabel}>{label}</span>
      <strong style={{ ...styles.insightValue, color: tone }}>{value}</strong>
      <span style={styles.muted}>{detail}</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={styles.panel}>
      <div style={styles.sectionLabel}>{title}</div>
      <div style={styles.panelContent}>{children}</div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.detail}>
      <span style={styles.muted}>{label}</span>
      <strong style={styles.detailValue}>{value}</strong>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statusBanner: { display: "flex", justifyContent: "space-between", gap: layout.space.md, alignItems: "center", flexWrap: "wrap", padding: layout.space.lg, backgroundColor: colors.accentPanel, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  statusTitle: { fontSize: 20, fontWeight: 700, margin: "4px 0" },
  statusMeta: { display: "flex", flexDirection: "column", gap: 4, color: colors.textMuted, fontFamily: typography.mono, fontSize: 11, textAlign: "right" },
  dailySection: { display: "flex", flexDirection: "column", gap: layout.space.md },
  insightGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: layout.space.sm },
  insightCard: { display: "flex", flexDirection: "column", gap: 6, padding: layout.space.md, backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: layout.radius.sm, minHeight: 96 },
  insightValue: { fontFamily: typography.mono, fontSize: 16, lineHeight: "20px" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: layout.space.sm },
  metricCard: { display: "flex", flexDirection: "column", gap: 6, padding: layout.space.md, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  metricValue: { fontFamily: typography.mono, fontSize: 20 },
  columns: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: layout.space.md },
  panel: { display: "flex", flexDirection: "column", gap: layout.space.md, padding: layout.space.lg, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: layout.radius.md },
  panelContent: { display: "flex", flexDirection: "column", gap: layout.space.sm },
  rowCard: { display: "flex", flexDirection: "column", gap: layout.space.sm, padding: layout.space.sm, backgroundColor: colors.surfaceAlt, borderRadius: layout.radius.sm },
  rowHeader: { display: "flex", justifyContent: "space-between", gap: layout.space.sm, alignItems: "center" },
  rowTitle: { color: colors.text, fontSize: 13 },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: layout.space.sm },
  detail: { display: "flex", flexDirection: "column", gap: 3 },
  detailValue: { color: colors.text, fontFamily: typography.mono, fontSize: 12 },
  loanSummary: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: layout.space.sm },
  explanation: { color: colors.textMuted, fontSize: 12, lineHeight: "18px", paddingTop: layout.space.xs },
  alertRow: { display: "flex", gap: layout.space.md, alignItems: "flex-start", padding: layout.space.sm, borderBottom: `1px solid ${colors.border}` },
  mono: { fontFamily: typography.mono, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" },
  sectionLabel: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.8 },
  muted: { color: colors.textMuted, fontSize: 12 },
  warnings: { display: "flex", flexDirection: "column", gap: 4, color: colors.warning, fontSize: 12, lineHeight: "18px" },
  emptyState: { color: colors.textMuted, padding: layout.space.xl, textAlign: "center" },
};
