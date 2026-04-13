import { StyleSheet, Text, View } from "react-native";

import { formatCurrency, formatPercentage, formatSignedCurrency } from "../lib/formatters";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";

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
  const isPositive = gain >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text style={styles.ticker}>{ticker}</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.currentValue}>{formatCurrency(currentValue)}</Text>
          <Text style={[styles.gain, isPositive ? styles.positive : styles.warning]}>
            {`${formatSignedCurrency(gain)} (${formatPercentage(gainPercentage)})`}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.meta}>
          {`${shares.toLocaleString("pt-BR", { maximumFractionDigits: 8 })} cotas @ ${formatCurrency(currentPrice)}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.xs,
    padding: layout.space.md,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  ticker: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: typographyScale.lg.fontSize,
    fontWeight: "600",
    lineHeight: 22,
  },
  name: {
    color: colors.textMuted,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
  amountBlock: {
    alignItems: "flex-end",
    gap: 3,
  },
  currentValue: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: typographyScale.md.fontSize,
    fontWeight: "600",
    lineHeight: 20,
  },
  gain: {
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "600",
  },
  positive: {
    color: colors.primary,
  },
  warning: {
    color: colors.warning,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meta: {
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
});
