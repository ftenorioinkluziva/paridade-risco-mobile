"use client";

import { useRouter } from "next/navigation";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { Screen } from "@/components/Screen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SummaryCard } from "@/components/SummaryCard";
import { PositionCard } from "@/components/PositionCard";
import { RebalanceDecisionCard } from "@/components/RebalanceDecisionCard";
import { InlineAlert } from "@/components/InlineAlert";
import { usePortfolioSummary, useRebalancePreview } from "@/context/AuthContext";
import { formatCurrency, formatPercentage, formatSignedCurrency } from "@/lib/formatters";

export default function OverviewPage() {
  const router = useRouter();
  const portfolio = usePortfolioSummary();
  const rebalance = useRebalancePreview();

  const portfolioError = portfolio.error;
  const rebalanceError = rebalance.error;
  const summary = portfolio.data;
  const rebalData = rebalance.data;

  return (
    <Screen
      title="Resumo"
      subtitle="Acompanhe a alocação, desempenho e decisões da sua carteira."
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

      {/* Rebalance decision + shortcut */}
      <RebalanceDecisionCard
        data={rebalData}
        isLoading={rebalance.isLoading}
        error={rebalanceError}
        compact
        showActions={false}
        showMetrics
        action={
          <PrimaryButton
            label="Ver plano"
            onPress={() => router.push("/rebalanceamento")}
          />
        }
      />

      {/* Valor total da carteira */}
      {summary?.totalValue != null ? (
        <SummaryCard
          eyebrow="VALOR_TOTAL"
          title={formatCurrency(summary.totalValue)}
          detail="Valor total da carteira"
          tone={summary.totalValue > 0 ? "success" : "default"}
        />
      ) : null}

      {/* Posições e Ganho/Perda (row) */}
      <div style={styles.row}>
        <div style={styles.half}>
          <SummaryCard
            eyebrow="POSICOES"
            title={String(summary?.positions?.length ?? 0)}
            detail="Ativos na carteira"
          />
        </div>
        <div style={styles.half}>
          <SummaryCard
            eyebrow="GANHO_PERDA"
            title={formatSignedCurrency(summary?.gain ?? 0)}
            detail={`${formatPercentage(summary?.gainPercentage ?? 0)} no período`}
            tone={(summary?.gain ?? 0) >= 0 ? "success" : "warning"}
          />
        </div>
      </div>

      {/* Caixa com drift */}
      {summary?.cash != null ? (
        <SummaryCard
          eyebrow="CAIXA"
          title={formatCurrency(summary.cash)}
          detail={`Drift total: ${formatPercentage(summary?.drift ?? 0)}`}
          tone={(summary?.drift ?? 0) > 1 ? "warning" : "default"}
        />
      ) : null}

      {/* Alocação Atual */}
      {summary?.allocation?.length > 0 ? (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>// ALOCACAO_ATUAL</div>
          <div style={styles.allocationList}>
            {summary.allocation.map((item: any, i: number) => {
              const actualPct = item.actualPercentage ?? item.percentage ?? 0;
              const targetPct = item.targetPercentage;
              const pctColor =
                targetPct != null && actualPct > targetPct
                  ? colors.warning
                  : colors.primary;

              return (
                <div key={i} style={styles.allocationItem}>
                  <div style={styles.allocationHeader}>
                    <span style={styles.allocationTicker}>{item.ticker}</span>
                    <span style={styles.allocationPercent}>
                      {formatPercentage(actualPct)}
                    </span>
                  </div>
                  <div style={styles.progressTrack}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${Math.min(Math.max(actualPct, 0), 100)}%`,
                        backgroundColor: pctColor,
                      }}
                    />
                  </div>
                  {targetPct != null ? (
                    <div style={styles.allocationDetail}>
                      Alvo: {formatPercentage(targetPct)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Posições Detalhadas */}
      {summary?.positions?.length > 0 ? (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>// POSICOES_DETALHADAS</div>
          <div style={styles.positionList}>
            {summary.positions.map((pos: any, i: number) => (
              <PositionCard
                key={i}
                ticker={pos.ticker}
                name={pos.name}
                shares={pos.shares ?? 0}
                currentPrice={pos.currentPrice ?? 0}
                currentValue={pos.currentValue ?? 0}
                gain={pos.gain ?? 0}
                gainPercentage={pos.gainPercentage ?? 0}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Fundos */}
      {summary?.funds?.length > 0 ? (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>// FUNDOS</div>
          <div style={styles.positionList}>
            {summary.funds.map((fund: any, i: number) => (
              <PositionCard
                key={i}
                ticker={fund.ticker ?? fund.code ?? "-"}
                name={fund.name}
                shares={fund.shares ?? 0}
                currentPrice={fund.currentPrice ?? 0}
                currentValue={fund.currentValue ?? 0}
                gain={fund.gain ?? 0}
                gainPercentage={fund.gainPercentage ?? 0}
              />
            ))}
          </div>
        </div>
      ) : null}
    </Screen>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    gap: layout.space.md,
  },
  half: {
    flex: 1,
    minWidth: 0,
  },
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
  allocationList: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
  },
  allocationItem: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    gap: layout.space.xs,
    padding: layout.space.md,
  },
  allocationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  allocationTicker: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: 600,
  },
  allocationPercent: {
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 500,
  },
  progressTrack: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    height: 6,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    borderRadius: 4,
    height: "100%",
    transition: "width 0.3s ease",
  },
  allocationDetail: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 10,
  },
  positionList: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
  },
};
