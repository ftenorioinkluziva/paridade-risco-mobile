import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { InlineAlert } from "../components/InlineAlert";
import { PrimaryButton } from "../components/PrimaryButton";
import { RebalanceDecisionCard } from "../components/RebalanceDecisionCard";
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
  const { data, error, isLoading, refetch } = useRebalancePreview();

  const actions = data?.actions ?? [];

  return (
    <Screen
      title="Rebalanceamento"
      subtitle="Veja se precisa agir e quais ordens usar na corretora."
      action={<PrimaryButton label="Voltar" onPress={() => navigation.goBack()} tone="neutral" />}
    >
      <RebalanceDecisionCard
        data={data}
        error={error}
        isLoading={isLoading}
        showActions={false}
        showMetrics={false}
      />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// ACOES_SUGERIDAS</Text>
        {error && !data ? (
          <InlineAlert
            actionLabel="Tentar novamente"
            message="O plano nao carregou. Atualize antes de comprar ou vender."
            onAction={refetch}
            title="Plano nao disponivel"
          />
        ) : null}
        {data && !data.eligibleForRebalance ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Dados pendentes para calcular</Text>
            <Text style={styles.warningText}>
              {`Preencha: ${data.missingProfileFields.join(", ")}`}
            </Text>
          </View>
        ) : null}
        {actions.map((item) => (
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
              {`Hoje ${formatPercentage(item.currentPercentage)} | Alvo ${formatPercentage(item.targetPercentage)}`}
            </Text>
          </View>
        ))}
        {!isLoading && data?.eligibleForRebalance && actions.length === 0 ? (
          <Text style={styles.emptyText}>Carteira dentro do alvo. Nenhuma ordem sugerida.</Text>
        ) : null}
        {actions.length > 0 ? (
          <View style={styles.guidanceCard}>
            <Text style={styles.guidanceText}>
              Use como referencia na corretora. O app nao executa as ordens.
            </Text>
          </View>
        ) : null}
        {data ? (
          <Text style={styles.contextLine}>
            {`Valor usado no calculo ${formatCurrency(data.calculationBaseValue)} | Caixa ${formatCurrency(data.cashAvailable)}`}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  positive: {
    color: colors.primary,
  },
  warning: {
    color: colors.warning,
  },
  warningCard: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.warning,
    borderRadius: layout.radius.sm,
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
  guidanceCard: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.sm,
    borderWidth: 1,
    gap: layout.space.xs,
    padding: layout.space.md,
  },
  guidanceText: {
    color: colors.textMuted,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: typographyScale.sm.fontWeight,
    lineHeight: 18,
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
  contextLine: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
});
