import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useRebalancePreview } from "../hooks/useAppData";
import { formatCurrency, formatPercentage } from "../lib/formatters";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export function RebalanceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, isLoading } = useRebalancePreview();

  return (
    <Screen
      title="Rebalanceamento"
      subtitle="Leitura objetiva da distancia entre a carteira atual e a cesta alvo."
      action={<PrimaryButton label="Voltar" onPress={() => navigation.goBack()} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>// TARGET_BASKET</Text>
        <Text style={styles.heroTitle}>{data?.targetBasketName ?? "Carregando"}</Text>
        <Text style={styles.heroText}>
          {isLoading
            ? "Calculando desvio e sugestoes."
            : `Carteira total ${formatCurrency(data?.portfolioValue ?? 0)} com desvio de ${formatPercentage(data?.driftPercentage ?? 0)}.`}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// SUGGESTED_ACTIONS</Text>
        {(data?.actions ?? []).map((item) => (
          <View key={item.id} style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <Text style={styles.actionTicker}>{item.ticker}</Text>
              <Text style={[styles.actionType, item.action === "APORTAR" ? styles.positive : styles.warning]}>
                {item.action}
              </Text>
            </View>
            <Text style={styles.actionAmount}>{formatCurrency(item.amount)}</Text>
            <Text style={styles.actionMeta}>
              {`Atual ${formatPercentage(item.currentPercentage)} -> Alvo ${formatPercentage(item.targetPercentage)}`}
            </Text>
          </View>
        ))}
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
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
  },
  heroText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  actionCard: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  actionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionTicker: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 16,
    fontWeight: "700",
  },
  actionType: {
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: "700",
  },
  positive: {
    color: colors.primary,
  },
  warning: {
    color: colors.warning,
  },
  actionAmount: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  actionMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
