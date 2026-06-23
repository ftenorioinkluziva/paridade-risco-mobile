"use client";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { formatCurrency, formatPercentage } from "@/lib/formatters";

type Props = {
  ticker: string;
  name: string;
  shares: number;
  currentPrice: number;
  currentValue: number;
  gain: number;
  gainPercentage: number;
};

export function PositionCard({ ticker, name, shares, currentPrice, currentValue, gain, gainPercentage }: Props) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.identity}>
          <div style={styles.ticker}>{ticker}</div>
          <div style={styles.name}>{name}</div>
        </div>
        <div style={styles.amountBlock}>
          <div style={styles.amount}>{formatCurrency(currentValue)}</div>
          <div style={{ ...styles.gain, color: gain >= 0 ? colors.primary : colors.warning }}>
            {gain >= 0 ? "+" : ""}{formatCurrency(gain)} ({formatPercentage(gainPercentage)})
          </div>
        </div>
      </div>
      <div style={styles.metricsRow}>
        <span style={styles.metric}>{shares.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} cotas</span>
        <span style={styles.metric}>{formatCurrency(currentPrice)}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
    padding: layout.space.md,
  },
  header: { display: "flex", justifyContent: "space-between", gap: layout.space.sm },
  identity: { flex: 1, display: "flex", flexDirection: "column", gap: 3 },
  ticker: { color: colors.text, fontFamily: typography.mono, fontSize: 16, fontWeight: 600 },
  name: { color: colors.textMuted, fontSize: 12 },
  amountBlock: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  amount: { color: colors.text, fontSize: 20, fontWeight: 600, lineHeight: "26px", fontFamily: typography.mono },
  gain: { fontFamily: typography.mono, fontSize: 10, fontWeight: 600 },
  metricsRow: { display: "flex", flexWrap: "wrap", gap: 12 },
  metric: { color: colors.textMuted, fontSize: 10, fontFamily: typography.mono },
};