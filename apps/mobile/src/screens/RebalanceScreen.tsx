import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { TypeBadge } from "../components/TypeBadge";
import { useRebalancePreview } from "../hooks/useAppData";
import { formatCurrency, formatPercentage } from "../lib/formatters";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";

export function RebalanceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, isLoading } = useRebalancePreview();

  const actions = data?.actions ?? [];

  return (
    <Screen
      title="Rebalanceamento"
      subtitle="Plano de ajuste com base de calculo obrigatoriamente incluindo caixa."
      action={<PrimaryButton label="Voltar" onPress={() => navigation.goBack()} tone="neutral" />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>// CESTA_ALVO</Text>
        <Text style={styles.heroTitle}>{data?.targetBasketName ?? "Carregando"}</Text>
        <Text style={styles.heroText}>
          {isLoading
            ? "Calculando desvio e sugestoes."
            : `Carteira total ${formatCurrency(data?.portfolioValue ?? 0)} com desvio de ${formatPercentage(data?.driftPercentage ?? 0)}.`}
        </Text>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Valor investido</Text>
          <Text style={styles.metricValue}>{formatCurrency(data?.investedValue ?? 0)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Caixa disponivel</Text>
          <Text style={styles.metricValue}>{formatCurrency(data?.cashAvailable ?? 0)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Base de calculo</Text>
          <Text style={styles.metricValue}>{formatCurrency(data?.calculationBaseValue ?? 0)}</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Custo do rebalanceamento</Text>
          <Text style={styles.metricValue}>{formatCurrency(data?.rebalanceCost ?? 0)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Saldo apos rebalanceamento</Text>
          <Text style={[styles.metricValue, (data?.postRebalanceCash ?? 0) >= 0 ? styles.positive : styles.warning]}>
            {formatCurrency(data?.postRebalanceCash ?? 0)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// ACOES_SUGERIDAS</Text>
        {data && !data.eligibleForRebalance ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Perfil incompleto para rebalanceamento</Text>
            <Text style={styles.warningText}>
              {`Preencha: ${data.missingProfileFields.join(", ")}`}
            </Text>
          </View>
        ) : null}
        {actions.map((item) => {
          const progress = item.targetPercentage > 0 ? Math.min((item.currentPercentage / item.targetPercentage) * 100, 200) : 0;

          return (
          <View key={item.id} style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <Text style={styles.actionTicker}>{item.ticker}</Text>
              <TypeBadge label={item.action === "APORTAR" ? "COMPRAR" : "VENDER"} />
            </View>
            <Text style={[styles.actionAmount, item.action === "APORTAR" ? styles.positive : styles.warning]}>
              {item.action === "APORTAR" ? "+" : "-"}{formatCurrency(item.amount)}
            </Text>
            {item.currentPrice > 0 ? (
              <Text style={styles.actionShares}>
                {`${(item.amount / item.currentPrice).toLocaleString("pt-BR", { maximumFractionDigits: 4 })} cotas @ ${formatCurrency(item.currentPrice)}`}
              </Text>
            ) : null}
            <Text style={styles.actionMeta}>
              {`Atual ${formatPercentage(item.currentPercentage)} → Alvo ${formatPercentage(item.targetPercentage)}`}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(progress, 100))}%` }]} />
            </View>
          </View>
          );
        })}
        {!isLoading && data?.eligibleForRebalance && actions.length === 0 ? (
          <Text style={styles.emptyText}>Carteira ja alinhada com a cesta alvo. Nenhum ajuste necessario.</Text>
        ) : null}
        <PrimaryButton label="Usar este plano" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 4,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  heroLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "700",
    letterSpacing: 0,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
  },
  heroText: {
    color: colors.textMuted,
    fontSize: typographyScale.md.fontSize,
    fontWeight: typographyScale.md.fontWeight,
    lineHeight: 20,
  },
  metricsGrid: {
    gap: 10,
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  metricLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "600",
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.md,
    padding: layout.space.lg,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "700",
    letterSpacing: 0,
  },
  actionCard: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.sm,
    padding: layout.space.md,
  },
  actionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionTicker: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: typographyScale.lg.fontSize,
    fontWeight: "600",
    lineHeight: 22,
  },
  actionType: {
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: "600",
  },
  positive: {
    color: colors.primary,
  },
  warning: {
    color: colors.warning,
  },
  warningCard: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.warning,
    borderRadius: 4,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  warningTitle: {
    color: colors.warning,
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: "600",
  },
  warningText: {
    color: colors.text,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
    lineHeight: 14,
  },
  actionAmount: {
    fontFamily: typography.mono,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  actionMeta: {
    color: colors.textMuted,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
  actionShares: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typographyScale.md.fontSize,
    fontWeight: typographyScale.md.fontWeight,
    lineHeight: 20,
  },
  progressTrack: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 2,
    height: 8,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: colors.primary,
    height: "100%",
  },
});
