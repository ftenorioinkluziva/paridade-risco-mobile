import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback } from "react";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SummaryCard } from "../components/SummaryCard";
import { usePortfolioSummary } from "../hooks/useAppData";
import { formatCurrency, formatPercentage, formatSignedCurrency } from "../lib/formatters";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export function OverviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, isLoading, refetch } = usePortfolioSummary();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const allocation = data?.allocation ?? [];
  const totalValue = data ? formatCurrency(data.totalValue) : "...";
  const drift = data ? formatPercentage(data.basketDriftPercentage) : "...";
  const gain = data ? formatSignedCurrency(data.unrealizedGain) : "...";

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
            : "Carteira consolidada com base nas posicoes e caixa."
        }
      />

      <View style={styles.row}>
        <View style={styles.column}>
          <SummaryCard
            eyebrow="// TARGET_DRIFT"
            title={drift}
            detail="A carteira esta proxima do alvo, mas ja pede ajuste."
            tone="warning"
          />
        </View>
        <View style={styles.column}>
          <SummaryCard
            eyebrow="// OPEN_PNL"
            title={gain}
            detail="Resultado acumulado nas posicoes abertas."
            tone="success"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// CURRENT_ALLOCATION</Text>
        <Text style={styles.sectionTitle}>Distribuicao atual</Text>
        {allocation.map((item) => (
          <View key={item.label} style={styles.positionCard}>
            <View style={styles.positionHeader}>
              <Text style={styles.positionLabel}>{item.label}</Text>
              <Text style={styles.positionValue}>{formatPercentage(item.percentage)}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${item.percentage}%` }]} />
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
    gap: 12,
    flexWrap: "wrap",
  },
  column: {
    flex: 1,
    minWidth: 140,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  positionCard: {
    gap: 8,
  },
  positionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  positionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  positionValue: {
    color: colors.primary,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: "700",
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
});
