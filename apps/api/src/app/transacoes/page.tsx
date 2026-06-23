"use client";

import { useRouter } from "next/navigation";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { Screen } from "@/components/Screen";
import { AuthGuard } from "@/components/AuthGuard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TypeBadge } from "@/components/TypeBadge";
import { useTransactions } from "@/context/AuthContext";
import { formatCurrency, formatDate } from "@/lib/formatters";

export default function TransacoesPage() {
  const router = useRouter();
  const { data: transactions, isLoading, error } = useTransactions();

  return (
    <AuthGuard>
      <Screen
      title="Transações"
      subtitle="Histórico de movimentações da carteira."
      action={
        <PrimaryButton
          label="Nova transação"
          onPress={() => router.push("/transacoes/nova")}
        />
      }
    >
      {/* Error state */}
      {error ? (
        <div style={styles.errorCard}>
          <span style={styles.errorTitle}>Erro ao carregar transações</span>
          <span style={styles.errorText}>{error}</span>
        </div>
      ) : null}

      {/* Loading state */}
      {isLoading && !error ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyTitle}>Carregando transações...</span>
        </div>
      ) : null}

      {/* Empty state */}
      {!isLoading && !error && (transactions?.length ?? 0) === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyTitle}>Nenhuma transação registrada ainda.</span>
          <span style={styles.emptyText}>
            Crie sua primeira transação para acompanhar as movimentações da carteira.
          </span>
        </div>
      ) : null}

      {/* Transaction list */}
      {!isLoading && (transactions?.length ?? 0) > 0 ? (
        <div style={styles.list}>
          <div style={styles.sectionLabel}>// HISTÓRICO_DE_TRANSAÇÕES</div>
          {transactions!.map((tx: any, index: number) => {
            const ticker = tx.assetTicker ?? tx.ticker ?? tx.symbol ?? "-";
            const name = tx.assetName ?? "";
            const type = tx.type ?? "";
            const shares = tx.shares ?? tx.quantity ?? 0;
            const value = tx.value ?? tx.amount ?? 0;
            const date = tx.date ?? tx.createdAt ?? tx.transactionDate ?? "";

            return (
              <div key={tx.id ?? index} style={styles.card}>
                {/* Name row */}
                {name ? (
                  <div style={styles.row}>
                    <span style={styles.name}>{name}</span>
                  </div>
                ) : null}
                {/* Top row: ticker + type badge */}
                <div style={styles.row}>
                  <span style={styles.ticker}>{ticker}</span>
                  <TypeBadge label={type} />
                </div>

                {/* Shares row */}
                <div style={styles.row}>
                  <span style={styles.label}>Quantidade</span>
                  <span style={styles.shares}>
                    {shares.toLocaleString("pt-BR")} cotas
                  </span>
                </div>

                {/* Value row */}
                <div style={styles.row}>
                  <span style={styles.label}>Valor</span>
                  <span style={styles.value}>{formatCurrency(value)}</span>
                </div>

                {/* Date row */}
                {date ? (
                  <div style={styles.dateRow}>
                    <span style={styles.dateLabel}>Data</span>
                    <span style={styles.dateValue}>{formatDate(date)}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </Screen>
    </AuthGuard>
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
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  ticker: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 16,
    fontWeight: 600,
    lineHeight: "24px",
  },
  name: {
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: 13,
    fontWeight: 400,
  },
  label: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: "16px",
  },
  shares: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: "20px",
  },
  value: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: "20px",
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