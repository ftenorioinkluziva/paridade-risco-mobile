"use client";

import { useRouter } from "next/navigation";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { Screen } from "@/components/Screen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SummaryCard } from "@/components/SummaryCard";
import { RebalanceDecisionCard } from "@/components/RebalanceDecisionCard";
import { InlineAlert } from "@/components/InlineAlert";
import { usePortfolioSummary, useRebalancePreview } from "@/context/AuthContext";
import { formatCurrency, formatSignedCurrency } from "@/lib/formatters";

export default function RebalanceamentoPage() {
  const router = useRouter();
  const portfolio = usePortfolioSummary();
  const rebalance = useRebalancePreview();

  const portfolioError = portfolio.error;
  const rebalanceError = rebalance.error;
  const summary = portfolio.data;
  const rebalData = rebalance.data;

  // Derived values
  const investedValue = rebalData?.calculationBaseValue ?? rebalData?.portfolioValue ?? 0;
  const cashAvailable = rebalData?.cashAvailable ?? summary?.cash ?? 0;
  const totalActionsCost = (rebalData?.actions ?? []).reduce(
    (acc: number, a: any) => acc + (a.amount ?? 0),
    0,
  );
  const rebalanceCost = rebalData?.rebalanceCost ?? totalActionsCost;
  const cashAfterRebalance = cashAvailable - rebalanceCost;

  return (
    <Screen
      title="Rebalanceamento"
      subtitle="Veja o plano detalhado, confira os custos e decida como agir na corretora."
      action={
        <PrimaryButton
          label="Voltar"
          onPress={() => router.back()}
          tone="neutral"
        />
      }
    >
      {/* Error alerts */}
      {portfolioError ? (
        <InlineAlert
          title="Erro no portfólio"
          message={portfolioError}
          tone="danger"
        />
      ) : null}
      {rebalanceError ? (
        <InlineAlert
          title="Erro no rebalanceamento"
          message={rebalanceError}
          tone="danger"
        />
      ) : null}

      {/* Full RebalanceDecisionCard with actions */}
      <RebalanceDecisionCard
        data={rebalData}
        isLoading={rebalance.isLoading}
        error={rebalanceError}
        showActions
        showMetrics
      />

      {/* Summary section */}
      {rebalData || summary ? (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>// RESUMO_FINANCEIRO</div>

          <div style={styles.row}>
            <div style={styles.half}>
              <SummaryCard
                eyebrow="VALOR_INVESTIDO"
                title={formatCurrency(investedValue)}
                detail="Base de cálculo do plano"
                tone={investedValue > 0 ? "success" : "default"}
              />
            </div>
            <div style={styles.half}>
              <SummaryCard
                eyebrow="CAIXA_DISPONIVEL"
                title={formatCurrency(cashAvailable)}
                detail="Recursos disponíveis em caixa"
                tone={cashAvailable > 0 ? "success" : "default"}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.half}>
              <SummaryCard
                eyebrow="CUSTO_REBALANCEAMENTO"
                title={formatSignedCurrency(rebalanceCost)}
                detail="Total estimado das ordens"
                tone={rebalanceCost > 0 ? "warning" : "default"}
              />
            </div>
            <div style={styles.half}>
              <SummaryCard
                eyebrow="CAIXA_POS_REBALANCEAMENTO"
                title={formatCurrency(cashAfterRebalance)}
                detail="Caixa estimado após as ordens"
                tone={cashAfterRebalance >= 0 ? "success" : "warning"}
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Empty state when no rebalance data and no error */}
      {!rebalance.isLoading && !rebalData && !rebalanceError ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyTitle}>Nenhum dado disponível</div>
          <div style={styles.emptyText}>
            Faça login ou aguarde o carregamento do portfólio para visualizar
            o plano de rebalanceamento.
          </div>
        </div>
      ) : null}
    </Screen>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.md,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  row: {
    display: "flex",
    gap: layout.space.md,
  },
  half: {
    flex: 1,
    minWidth: 0,
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