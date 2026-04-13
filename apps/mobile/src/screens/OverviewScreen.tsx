import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PrimaryButton } from "../components/PrimaryButton";
import { PositionCard } from "../components/PositionCard";
import { Screen } from "../components/Screen";
import { SummaryCard } from "../components/SummaryCard";
import { TypeBadge } from "../components/TypeBadge";
import { usePortfolioSummary, useRebalancePreview } from "../hooks/useAppData";
import { useStaleFocusRefetch } from "../hooks/useStaleFocusRefetch";
import { formatCurrency, formatPercentage, formatSignedCurrency } from "../lib/formatters";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";

export function OverviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, isLoading, refetch } = usePortfolioSummary();
  const { data: rebalanceData } = useRebalancePreview();
  useStaleFocusRefetch(refetch);

  const allocation = data?.allocation ?? [];
  const totalValue = data ? formatCurrency(data.totalValue) : "...";
  const positionsValue = data ? formatCurrency(data.positionsValue) : "...";
  const cashBalance = data ? formatCurrency(data.cashBalance) : "...";
  const drift = data ? formatPercentage(data.basketDriftPercentage) : "...";
  const gain = data ? formatSignedCurrency(data.unrealizedGain) : "...";
  const positionCount = data?.positionCount ?? 0;
  const positions = data?.positions ?? [];
  const funds = data?.funds ?? [];
  const actionsByTicker = new Map((rebalanceData?.actions ?? []).map((action) => [action.ticker, action]));

  return (
    <Screen
      title="Resumo"
      subtitle="Visao compacta da carteira para decisoes rapidas no celular."
      action={<PrimaryButton label="Rebalancear" onPress={() => navigation.navigate("Rebalanceamento")} />}
    >
      <SummaryCard
        eyebrow="// TOTAL_VALUE"
        title={totalValue}
        detail={
          isLoading
            ? "Carregando consolidacao da carteira."
            : "Carteira + fundos + caixa."
        }
      />

      <View style={styles.row}>
        <View style={styles.column}>
          <SummaryCard
            eyebrow="// POSICOES"
            title={positionsValue}
            detail={`${positionCount} ativos com posicao aberta.`}
          />
        </View>
        <View style={styles.column}>
          <SummaryCard
            eyebrow="// GANHO_PERDA"
            title={gain}
            detail="Resultado acumulado nas posicoes abertas."
            tone="success"
          />
        </View>
      </View>

      <SummaryCard
        eyebrow="// CAIXA"
        title={cashBalance}
        detail={`Desvio atual da cesta: ${drift}`}
      />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// ALOCACAO_ATUAL</Text>
        <Text style={styles.sectionTitle}>Distribuicao atual</Text>
        {allocation.map((item) => {
          const rebalanceAction = actionsByTicker.get(item.ticker);
          const actionLabel = rebalanceAction?.action === "APORTAR" ? "COMPRAR" : "VENDER";
          const actionTone = rebalanceAction?.action === "APORTAR" ? styles.positiveText : styles.warningText;

          return (
            <View key={item.label} style={styles.positionCard}>
              <View style={styles.positionHeader}>
                <Text style={styles.positionLabel}>{item.label}</Text>
                <Text style={styles.positionValue}>{formatPercentage(item.percentage)}</Text>
              </View>
              {rebalanceAction ? (
                <View style={styles.rebalanceRow}>
                  <TypeBadge label={actionLabel} />
                  <View style={styles.rebalanceValues}>
                    <Text style={[styles.rebalanceAmount, actionTone]}>
                      {rebalanceAction.action === "APORTAR" ? "+" : "-"}{formatCurrency(rebalanceAction.amount)}
                    </Text>
                    {rebalanceAction.currentPrice > 0 ? (
                      <Text style={styles.rebalanceShares}>
                        {`${(rebalanceAction.amount / rebalanceAction.currentPrice).toLocaleString("pt-BR", { maximumFractionDigits: 4 })} cotas`}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${item.percentage}%` }]} />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// POSICOES_DETALHADAS</Text>
        <Text style={styles.sectionTitle}>Posicoes detalhadas</Text>
        {positions.map((position) => (
          <PositionCard
            key={position.id}
            ticker={position.ticker}
            name={position.name}
            shares={position.shares}
            currentPrice={position.currentPrice}
            currentValue={position.currentValue}
            gain={position.gain}
            gainPercentage={position.gainPercentage}
          />
        ))}
        {funds.map((fund) => (
          <View key={fund.id} style={styles.positionDetailCard}>
            <View style={styles.positionDetailHeader}>
              <View style={styles.positionIdentity}>
                <Text style={styles.positionTicker}>{fund.indexTicker ? `FUNDO ${fund.indexTicker}` : "FUNDO"}</Text>
                <Text style={styles.positionName}>{fund.name}</Text>
              </View>
              <View style={styles.positionAmountBlock}>
                <Text style={styles.positionAmount}>{formatCurrency(fund.currentValue)}</Text>
                <Text style={[styles.positionGain, fund.gain >= 0 ? styles.positiveText : styles.warningText]}>
                  {`${formatSignedCurrency(fund.gain)} (${formatPercentage(fund.gainPercentage)})`}
                </Text>
              </View>
            </View>
            <View style={styles.positionMetricsRow}>
              <Text style={styles.positionMetric}>{`Aplicado: ${formatCurrency(fund.initialInvestment)}`}</Text>
              <Text style={styles.positionMetric}>{`Desde: ${new Date(fund.investmentDate).toLocaleDateString("pt-BR")}`}</Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: layout.space.md,
    flexWrap: "wrap",
  },
  column: {
    flex: 1,
    minWidth: 140,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    padding: layout.space.lg,
    gap: layout.space.md,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "700",
    letterSpacing: 0,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  positionCard: {
    gap: layout.space.sm,
  },
  positionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  positionLabel: {
    color: colors.text,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: "500",
  },
  positionValue: {
    color: colors.primary,
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: "600",
  },
  rebalanceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  rebalanceValues: {
    alignItems: "flex-start",
    gap: 1,
  },
  rebalanceAmount: {
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: "700",
  },
  rebalanceShares: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
  progressTrack: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 2,
    height: 10,
    overflow: "hidden",
  },
  progressBar: {
    backgroundColor: colors.primary,
    height: "100%",
  },
  positionDetailCard: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.sm,
    padding: layout.space.md,
  },
  positionDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: layout.space.sm,
  },
  positionIdentity: {
    flex: 1,
    gap: 3,
  },
  positionTicker: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: typographyScale.lg.fontSize,
    fontWeight: "600",
  },
  positionName: {
    color: colors.textMuted,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: typographyScale.sm.fontWeight,
  },
  positionAmountBlock: {
    alignItems: "flex-end",
    gap: 4,
  },
  positionAmount: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
  },
  positionGain: {
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "600",
  },
  positiveText: {
    color: colors.primary,
  },
  warningText: {
    color: colors.warning,
  },
  positionMetricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  positionMetric: {
    color: colors.textMuted,
    fontSize: typographyScale.xs.fontSize,
    fontFamily: typography.mono,
  },
});
