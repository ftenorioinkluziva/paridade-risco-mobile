import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { RebalancePreview } from "../domain/rebalance";
import { formatCurrency, formatPercentage } from "../lib/formatters";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";
import { TypeBadge } from "./TypeBadge";

type RebalanceDecisionCardProps = {
  data: RebalancePreview | null;
  isLoading?: boolean;
  error?: string | null;
  action?: ReactNode;
  compact?: boolean;
  showActions?: boolean;
  showMetrics?: boolean;
};

export function RebalanceDecisionCard({
  data,
  isLoading = false,
  error,
  action,
  compact = false,
  showActions = true,
  showMetrics = true,
}: RebalanceDecisionCardProps) {
  const actions = data?.actions ?? [];
  const hasError = Boolean(error && !data);
  const needsRebalance = Boolean(data?.eligibleForRebalance && actions.length > 0);
  const isBlocked = Boolean(data && !data.eligibleForRebalance);
  const statusLabel = hasError
    ? "Plano nao calculado"
    : isLoading
      ? "Calculando plano"
      : isBlocked
        ? "Dados pendentes"
        : needsRebalance
          ? "Precisa rebalancear"
          : "Dentro do alvo";
  const title = hasError
    ? "Nao foi possivel montar o plano"
    : isLoading
      ? "Verificando sua carteira"
    : isBlocked
        ? "Complete os dados para calcular"
        : needsRebalance
          ? "Ajuste sua carteira agora"
          : "Nenhuma compra ou venda necessaria";
  const detail = hasError
    ? "Atualize o plano antes de decidir compras ou vendas."
    : isLoading
      ? "Comparando sua carteira com a cesta ativa."
      : isBlocked
        ? `Preencha antes de calcular: ${data?.missingProfileFields.join(", ") || "perfil"}.`
        : needsRebalance
          ? `${actions.length} ordem${actions.length === 1 ? "" : "s"} sugerida${actions.length === 1 ? "" : "s"} para voltar ao alvo ${data?.targetBasketName ?? "ativo"}.`
          : `Distancia do alvo: ${formatPercentage(data?.driftPercentage ?? 0)}. A carteira esta dentro da faixa.`;

  return (
    <View style={[styles.card, needsRebalance ? styles.cardAction : undefined, hasError || isBlocked ? styles.cardWarning : undefined]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>// DECISAO_REBALANCEAMENTO</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.status, needsRebalance ? styles.statusAction : undefined, hasError || isBlocked ? styles.statusWarning : undefined]}>{statusLabel}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.detail}>{detail}</Text>
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>

      {showMetrics && data && !isBlocked ? (
        <View style={[styles.metricsRow, compact ? styles.metricsRowCompact : undefined]}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Distancia do alvo</Text>
            <Text style={styles.metricValue}>{formatPercentage(data.driftPercentage)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Valor das ordens</Text>
            <Text style={styles.metricValue}>{formatCurrency(data.rebalanceCost)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Caixa depois</Text>
            <Text style={[styles.metricValue, data.postRebalanceCash >= 0 ? styles.positive : styles.warning]}>
              {formatCurrency(data.postRebalanceCash)}
            </Text>
          </View>
        </View>
      ) : null}

      {showActions && needsRebalance ? (
        <View style={styles.actionList}>
          {actions.slice(0, compact ? 2 : 3).map((item) => (
            <View key={item.id} style={styles.actionItem}>
              <View style={styles.actionIdentity}>
                <Text style={styles.ticker}>{item.ticker}</Text>
                <TypeBadge label={item.action === "APORTAR" ? "COMPRAR" : "VENDER"} />
              </View>
              <Text style={[styles.amount, item.action === "APORTAR" ? styles.positive : styles.warning]}>
                {item.action === "APORTAR" ? "+" : "-"}{formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
          {actions.length > (compact ? 2 : 3) ? (
            <Text style={styles.moreText}>{`+${actions.length - (compact ? 2 : 3)} ajuste(s) no plano completo`}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.lg,
    padding: layout.space.lg,
  },
  cardAction: {
    borderColor: colors.primary,
  },
  cardWarning: {
    borderColor: colors.warning,
  },
  header: {
    gap: layout.space.md,
  },
  titleBlock: {
    gap: layout.space.xs,
  },
  eyebrow: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "700",
    letterSpacing: 0,
  },
  statusRow: {
    alignItems: "flex-start",
  },
  status: {
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "700",
  },
  statusAction: {
    color: colors.primary,
  },
  statusWarning: {
    color: colors.warning,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  detail: {
    color: colors.textMuted,
    fontSize: typographyScale.md.fontSize,
    fontWeight: typographyScale.md.fontWeight,
    lineHeight: 20,
  },
  action: {
    alignSelf: "flex-start",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: layout.space.sm,
  },
  metricsRowCompact: {
    gap: layout.space.xs,
  },
  metric: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.sm,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minWidth: 96,
    padding: layout.space.sm,
  },
  metricLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "600",
  },
  metricValue: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: "700",
  },
  actionList: {
    gap: layout.space.sm,
  },
  actionItem: {
    alignItems: "center",
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: layout.space.sm,
    paddingHorizontal: layout.space.md,
    paddingVertical: layout.space.sm,
  },
  actionIdentity: {
    alignItems: "center",
    flexDirection: "row",
    gap: layout.space.sm,
  },
  ticker: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: typographyScale.md.fontSize,
    fontWeight: "700",
  },
  amount: {
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: "700",
  },
  positive: {
    color: colors.primary,
  },
  warning: {
    color: colors.warning,
  },
  moreText: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
});
