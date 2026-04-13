import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SegmentedControl } from "../components/SegmentedControl";
import { TypeBadge } from "../components/TypeBadge";
import { usePortfolioSummary, useTransactions } from "../hooks/useAppData";
import { useStaleFocusRefetch } from "../hooks/useStaleFocusRefetch";
import { formatCurrency, formatSignedCurrency } from "../lib/formatters";
import { apiClient } from "../services/api/client";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";

type TransactionsTab = "NOVA" | "HISTORICO" | "ANALISE";

export function TransactionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<TransactionsTab>("NOVA");
  const [typeFilter, setTypeFilter] = useState<"COMPRA" | "VENDA" | "TODAS">("TODAS");
  const [periodDays, setPeriodDays] = useState<7 | 30 | 90>(30);
  const [assetTickerFilter, setAssetTickerFilter] = useState("");
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState("");
  const [isSavingCash, setIsSavingCash] = useState(false);

  const fromDateIso = useMemo(() => {
    const reference = new Date();
    reference.setHours(0, 0, 0, 0);
    reference.setDate(reference.getDate() - periodDays);
    return reference.toISOString();
  }, [periodDays]);

  const { data, error, isLoading, refetch } = useTransactions({
    assetTicker: assetTickerFilter.trim() ? assetTickerFilter.trim().toUpperCase() : undefined,
    from: fromDateIso,
    type: typeFilter === "TODAS" ? undefined : typeFilter,
  });
  const { data: summary, refetch: refetchSummary } = usePortfolioSummary();

  const analytics = useMemo(() => {
    const rows = data ?? [];
    const buys = rows.filter((item) => item.type === "COMPRA").reduce((sum, item) => sum + item.amount, 0);
    const sells = rows.filter((item) => item.type === "VENDA").reduce((sum, item) => sum + item.amount, 0);

    return {
      buys,
      netFlow: buys - sells,
      sells,
      total: rows.length,
    };
  }, [data]);
  useStaleFocusRefetch(refetch);
  useStaleFocusRefetch(refetchSummary);

  function startEditCash() {
    setCashInput(String(summary?.cashBalance ?? 0).replace(",", "."));
    setIsEditingCash(true);
  }

  async function handleSaveCash() {
    if (isSavingCash) {
      return;
    }

    const cashValue = parseFloat(cashInput.replace(",", "."));

    if (!Number.isFinite(cashValue) || cashValue < 0) {
      Alert.alert("Valor inválido", "Digite um valor numérico válido e positivo.");
      return;
    }

    try {
      setIsSavingCash(true);
      await apiClient.updateCashBalance(cashValue);
      await Promise.all([refetch(), refetchSummary()]);
      setIsEditingCash(false);
      Alert.alert("Saldo atualizado", `Novo saldo em caixa: ${formatCurrency(cashValue)}`);
    } catch {
      Alert.alert("Falha ao atualizar", "Não foi possível atualizar o saldo em caixa.");
    } finally {
      setIsSavingCash(false);
    }
  }

  return (
    <Screen
      title="Transacoes"
      subtitle="Fluxo operacional com saldo, lancamento rapido, historico filtravel e analise por periodo."
      action={<PrimaryButton label="Nova transacao" onPress={() => navigation.navigate("NovaTransacao")} />}
    >
      {isEditingCash ? (
        <View style={styles.balanceCardEdit}>
          <Text style={styles.balanceLabel}>Novo saldo</Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setCashInput}
            placeholder="0.00"
            placeholderTextColor={colors.textSoft}
            style={styles.balanceInput}
            value={cashInput}
          />
          <View style={styles.balanceActions}>
            <PrimaryButton label="Cancelar" onPress={() => setIsEditingCash(false)} tone="neutral" />
            <PrimaryButton label={isSavingCash ? "Salvando" : "Confirmar"} onPress={() => void handleSaveCash()} />
          </View>
        </View>
      ) : (
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo disponivel</Text>
          <Text style={styles.balanceValue}>{formatCurrency(summary?.cashBalance ?? 0)}</Text>
          <PrimaryButton label="Editar" onPress={startEditCash} tone="neutral" />
        </View>
      )}

      <View style={styles.tabRow}>
        <SegmentedControl
          onChange={setActiveTab}
          options={[
            { label: "Nova", value: "NOVA" },
            { label: "Historico", value: "HISTORICO" },
            { label: "Analise", value: "ANALISE" },
          ]}
          value={activeTab}
        />
      </View>

      {activeTab === "NOVA" ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>// NOVA_TRANSACAO</Text>
          <Text style={styles.sectionTitle}>Registro rapido</Text>
          <Text style={styles.sectionText}>
            Abra o formulario operacional completo para lancar compra ou venda com ativo, quantidade, preco e data.
          </Text>
          <PrimaryButton label="Abrir formulario" onPress={() => navigation.navigate("NovaTransacao")} />
        </View>
      ) : null}

      {activeTab === "HISTORICO" ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>// FILTROS</Text>
          <View style={styles.filterRow}>
            <SegmentedControl
              onChange={setTypeFilter}
              options={[
                { label: "Todas", value: "TODAS" },
                { label: "Compra", value: "COMPRA" },
                { label: "Venda", value: "VENDA" },
              ]}
              value={typeFilter}
            />
          </View>
          <View style={styles.filterRow}>
            <SegmentedControl
              onChange={setPeriodDays}
              options={[
                { label: "7d", value: 7 },
                { label: "30d", value: 30 },
                { label: "90d", value: 90 },
              ]}
              value={periodDays}
            />
          </View>
          <TextInput
            onChangeText={setAssetTickerFilter}
            placeholder="Filtrar por ticker (ex: BOVA11)"
            placeholderTextColor={colors.textSoft}
            style={styles.input}
            value={assetTickerFilter}
          />

          <View style={styles.list}>
            <Text style={styles.sectionLabel}>// ULTIMAS_TRANSACOES</Text>
            {(data ?? []).map((item) => {
              const isBuy = item.type === "COMPRA";
              const signedAmount = isBuy ? -item.amount : item.amount;
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                      <TypeBadge label={item.type} />
                      <Text style={styles.title}>{item.assetTicker}</Text>
                    </View>
                    <Text style={[styles.amount, isBuy ? styles.amountNegative : styles.amountPositive]}>
                      {isBuy ? "-" : "+"}{formatCurrency(item.amount)}
                    </Text>
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.meta}>
                      {`${item.shares.toLocaleString("pt-BR", { maximumFractionDigits: 8 })} ações @ ${formatCurrency(item.pricePerShare)}`}
                    </Text>
                    <Text style={styles.meta}>{item.dateLabel}</Text>
                  </View>
                </View>
              );
            })}
            {isLoading ? <Text style={styles.loading}>Carregando transacoes...</Text> : null}
            {error ? <Text style={styles.loading}>Falha ao carregar transacoes.</Text> : null}
            {!isLoading && !error && (data?.length ?? 0) === 0 ? (
              <Text style={styles.loading}>Nenhuma transacao encontrada para os filtros selecionados.</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {activeTab === "ANALISE" ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>// ANALISE_PERIODO</Text>
          <Text style={styles.sectionTitle}>Consolidado do periodo</Text>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Compras</Text>
            <Text style={styles.analyticsValue}>{formatCurrency(analytics.buys)}</Text>
          </View>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Vendas</Text>
            <Text style={styles.analyticsValue}>{formatCurrency(analytics.sells)}</Text>
          </View>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Fluxo liquido</Text>
            <Text style={[styles.analyticsValue, analytics.netFlow >= 0 ? styles.positiveText : styles.warningText]}>
              {formatSignedCurrency(analytics.netFlow)}
            </Text>
          </View>
          <Text style={styles.analyticsMeta}>{`${analytics.total} transacoes no recorte atual`}</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        <PrimaryButton disabled={isLoading} label="Atualizar dados" onPress={() => void refetch()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.primary,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.md,
    padding: layout.space.lg,
  },
  balanceLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "600",
  },
  balanceValue: {
    color: colors.primary,
    fontFamily: typography.mono,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
  },
  balanceCardEdit: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.primary,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.md,
    padding: layout.space.lg,
  },
  balanceInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 16,
    minHeight: layout.touch.minimum,
    paddingHorizontal: layout.space.md,
  },
  balanceActions: {
    flexDirection: "row",
    gap: layout.space.sm,
    flex: 1,
    flexWrap: "wrap",
  },
  tabRow: {
    gap: 8,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.md,
    padding: layout.space.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typographyScale.lg.fontSize,
    fontWeight: "600",
    lineHeight: 22,
  },
  sectionText: {
    color: colors.textMuted,
    fontSize: typographyScale.md.fontSize,
    fontWeight: typographyScale.md.fontWeight,
    lineHeight: 20,
  },
  filterRow: {
    gap: 8,
  },
  input: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    color: colors.text,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.xs,
    padding: layout.space.md,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "700",
    letterSpacing: 0,
  },
  cardTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: layout.space.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    fontSize: typographyScale.lg.fontSize,
    fontWeight: "600",
    lineHeight: 22,
  },
  amount: {
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: "600",
  },
  amountNegative: {
    color: colors.danger,
  },
  amountPositive: {
    color: colors.primary,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meta: {
    color: colors.textMuted,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
  badge: {
    // used via TypeBadge component
  },
  badgeBuy: {},
  badgeSell: {},
  badgeText: {},
  badgeBuyText: {},
  badgeSellText: {},
  loading: {
    color: colors.textMuted,
    fontSize: typographyScale.md.fontSize,
    fontWeight: typographyScale.md.fontWeight,
    textAlign: "center",
  },
  analyticsCard: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  analyticsLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "600",
  },
  analyticsValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
  },
  analyticsMeta: {
    color: colors.textMuted,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
  positiveText: {
    color: colors.primary,
  },
  warningText: {
    color: colors.warning,
  },
});
