"use client";

import { useRouter } from "next/navigation";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { Screen } from "@/components/Screen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useFunds } from "@/context/AuthContext";
import { formatCurrency, formatPercentage, formatSignedCurrency, formatDate } from "@/lib/formatters";

export default function FundosPage() {
  const router = useRouter();
  const { data: funds, isLoading, error } = useFunds();

  return (
    <Screen
      title="Fundos"
      subtitle="Acompanhe os fundos de investimento da carteira."
      action={
        <PrimaryButton
          label="Novo fundo"
          onPress={() => router.push("/fundos/novo")}
        />
      }
    >
      {/* Error state */}
      {error ? (
        <div style={styles.errorCard}>
          <span style={styles.errorTitle}>Erro ao carregar fundos</span>
          <span style={styles.errorText}>{error}</span>
        </div>
      ) : null}

      {/* Loading state */}
      {isLoading && !error ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyTitle}>Carregando fundos...</span>
        </div>
      ) : null}

      {/* Empty state */}
      {!isLoading && !error && (funds?.length ?? 0) === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyTitle}>Nenhum fundo cadastrado ainda.</span>
          <span style={styles.emptyText}>
            Crie seu primeiro fundo de investimento para acompanhar o desempenho na carteira.
          </span>
        </div>
      ) : null}

      {/* Fund list */}
      {!isLoading && (funds?.length ?? 0) > 0 ? (
        <div style={styles.list}>
          <div style={styles.sectionLabel}>// FUNDOS_CADASTRADOS</div>
          {funds!.map((item: any) => {
            const gain = item.gain ?? 0;
            const gainPct = item.gainPercentage ?? 0;
            const isPositive = gain >= 0;

            return (
              <button
                key={item.id ?? item.ticker ?? item.name}
                onClick={() => router.push(`/fundos/${item.id}`)}
                style={styles.card}
              >
                {/* Top row: name + ticker */}
                <div style={styles.row}>
                  <span style={styles.name}>{item.name}</span>
                  <span style={styles.indexTicker}>
                    {item.indexTicker ?? item.ticker ?? "-"}
                  </span>
                </div>

                {/* Value row */}
                <div style={styles.row}>
                  <span style={styles.label}>Valor atual</span>
                  <span style={styles.value}>
                    {formatCurrency(item.currentValue ?? item.currentPrice ?? 0)}
                  </span>
                </div>

                {/* Gain/loss row */}
                <div style={styles.row}>
                  <span style={styles.label}>Ganho / Perda</span>
                  <span
                    style={{
                      ...styles.gain,
                      color: isPositive ? colors.success : colors.danger,
                    }}
                  >
                    {formatSignedCurrency(gain)}{" "}
                    <span style={styles.gainPct}>
                      ({formatPercentage(gainPct)})
                    </span>
                  </span>
                </div>

                {/* Investment date */}
                {item.investmentDate ?? item.createdAt ? (
                  <div style={styles.dateRow}>
                    <span style={styles.dateLabel}>Investido em</span>
                    <span style={styles.dateValue}>
                      {formatDate(item.investmentDate ?? item.createdAt)}
                    </span>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </Screen>
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
    all: "unset",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
    padding: layout.space.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    transition: "opacity 0.15s",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 600,
    lineHeight: "24px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    flex: 1,
  },
  indexTicker: {
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: "16px",
  },
  label: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: "16px",
  },
  value: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: "20px",
  },
  gain: {
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: "20px",
  },
  gainPct: {
    fontSize: 12,
    fontWeight: 500,
  },
  dateRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopStyle: "solid" as const,
    borderTopColor: colors.border,
  },
  dateLabel: {
    color: colors.textSoft,
    fontSize: 11,
    lineHeight: "16px",
  },
  dateValue: {
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: 11,
    lineHeight: "16px",
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
