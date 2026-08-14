"use client";

import type { ReactNode } from "react";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { TypeBadge } from "./TypeBadge";

type Props = {
  data: any;
  isLoading?: boolean;
  error?: string | null;
  action?: ReactNode;
  compact?: boolean;
  showActions?: boolean;
  showMetrics?: boolean;
};

export function RebalanceDecisionCard({
  data, isLoading = false, error, action, compact = false,
  showActions = true, showMetrics = true,
}: Props) {
  const actions = data?.actions ?? [];
  const hasError = Boolean(error && !data);
  const needsRebalance = Boolean(data?.eligibleForRebalance && actions.length > 0);
  const isBlocked = Boolean(data && !data.eligibleForRebalance);
  const isPartial = Boolean(data?.analysisStatus === "PARCIAL");
  const statusLabel = hasError ? "Plano nao calculado"
    : isLoading ? "Calculando plano"
    : isBlocked ? "Dados pendentes"
    : isPartial ? "Análise parcial"
    : needsRebalance ? "Rebalanceamento necessario"
    : "Carteira ajustada";
  const statusColor = hasError ? colors.danger
    : isLoading ? colors.textMuted
    : isBlocked ? colors.warning
    : isPartial ? colors.warning
    : needsRebalance ? colors.accentCyan
    : colors.primary;

  return (
    <div style={{ ...styles.card, borderColor: statusColor }}>
      <div style={styles.row}>
        <div style={styles.headerBlock}>
          <div style={styles.eyebrow}>// DECISAO</div>
          <div style={{ ...styles.statusLabel, color: statusColor }}>{statusLabel}</div>
          {!compact && data?.targetBasketName ? (
            <div style={styles.basketName}>Alvo: {data.targetBasketName}</div>
          ) : null}
        </div>
        <div style={styles.metrics}>
          {showMetrics && data ? (
            <>
              <div style={styles.metric}>
                <div style={styles.metricValue}>{formatPercentage(data.driftPercentage ?? 0)}</div>
                <div style={styles.metricLabel}>drift</div>
              </div>
              <div style={styles.metric}>
                <div style={styles.metricValue}>{formatCurrency(data.portfolioValue ?? 0)}</div>
                <div style={styles.metricLabel}>carteira</div>
              </div>
            </>
          ) : null}
        </div>
      </div>
      {action ? <div>{action}</div> : null}
      {showActions && actions.length > 0 ? (
        <div style={styles.actions}>
          {actions.slice(0, compact ? 3 : actions.length).map((a: any, i: number) => (
            <div key={i} style={styles.actionRow}>
              <TypeBadge label={a.action === "APORTAR" ? "COMPRAR" : "VENDER"} />
              <span style={styles.actionTicker}>{a.ticker}</span>
              <span style={styles.actionAmount}>{formatCurrency(a.amount)}</span>
              <span style={styles.actionTarget}>{formatPercentage(a.targetPercentage)}</span>
            </div>
          ))}
          {compact && actions.length > 3 ? (
            <div style={styles.moreActions}>+{actions.length - 3} ordens</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: colors.accentPanel,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    gap: layout.space.md,
    padding: layout.space.lg,
  },
  row: { display: "flex", justifyContent: "space-between", gap: layout.space.md, flexWrap: "wrap" },
  headerBlock: { display: "flex", flexDirection: "column", gap: 4 },
  eyebrow: { color: colors.textSoft, fontFamily: typography.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.8 },
  statusLabel: { fontFamily: typography.mono, fontSize: 14, fontWeight: 600 },
  basketName: { color: colors.textMuted, fontSize: 12 },
  metrics: { display: "flex", gap: layout.space.lg },
  metric: { textAlign: "right" },
  metricValue: { color: colors.text, fontFamily: typography.mono, fontSize: 16, fontWeight: 600 },
  metricLabel: { color: colors.textSoft, fontSize: 10, fontFamily: typography.mono },
  actions: { display: "flex", flexDirection: "column", gap: 6 },
  actionRow: { display: "flex", alignItems: "center", gap: 8, fontFamily: typography.mono, fontSize: 12 },
  actionTicker: { color: colors.text, fontWeight: 600 },
  actionAmount: { color: colors.textMuted, marginLeft: "auto" },
  actionTarget: { color: colors.textSoft, minWidth: 50, textAlign: "right" },
  moreActions: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 11 },
};
