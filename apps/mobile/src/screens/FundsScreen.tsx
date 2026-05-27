import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useFunds } from "../hooks/useAppData";
import { useStaleFocusRefetch } from "../hooks/useStaleFocusRefetch";
import { formatCurrency, formatPercentage, formatSignedCurrency } from "../lib/formatters";
import { apiClient } from "../services/api/client";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";

export function FundsScreen() {
  const { data: funds, isLoading, refetch } = useFunds();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFundId, setEditingFundId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [initialInput, setInitialInput] = useState("");
  const [currentInput, setCurrentInput] = useState("");
  const [investmentDateInput, setInvestmentDateInput] = useState("");
  const [quickValueByFundId, setQuickValueByFundId] = useState<Record<string, string>>({});
  useStaleFocusRefetch(refetch);

  const summary = useMemo(() => {
    const list = funds ?? [];
    const totalInvested = list.reduce((sum, fund) => sum + fund.initialInvestment, 0);
    const currentValue = list.reduce((sum, fund) => sum + fund.currentValue, 0);
    const gain = currentValue - totalInvested;
    const profitability = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;

    return {
      currentValue,
      gain,
      profitability,
      totalInvested,
    };
  }, [funds]);

  function resetForm() {
    setEditingFundId(null);
    setNameInput("");
    setInitialInput("");
    setCurrentInput("");
    setInvestmentDateInput("");
  }

  function parseMoney(value: string) {
    const normalized = value.replace(",", ".").trim();
    const numberValue = Number(normalized);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      return null;
    }

    return numberValue;
  }

  async function handleSubmitFund() {
    if (isSubmitting) {
      return;
    }

    const initialInvestment = parseMoney(initialInput);
    const currentValue = parseMoney(currentInput);

    if (!nameInput.trim() || initialInvestment === null || currentValue === null || !investmentDateInput.trim()) {
      Alert.alert("Dados incompletos", "Preencha nome, valor aplicado, valor atual e data no formato AAAA-MM-DD.");
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingFundId) {
        await apiClient.updateFund(editingFundId, {
          currentValue,
          initialInvestment,
          investmentDate: new Date(`${investmentDateInput}T00:00:00.000Z`).toISOString(),
          name: nameInput.trim(),
        });
      } else {
        await apiClient.createFund({
          currentValue,
          initialInvestment,
          investmentDate: new Date(`${investmentDateInput}T00:00:00.000Z`).toISOString(),
          name: nameInput.trim(),
        });
      }

      await refetch();
      resetForm();
    } catch {
      Alert.alert("Fundo nao salvo", "Revise nome, valores e data antes de tentar novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteFund(fundId: string) {
    Alert.alert("Excluir fundo", "Remover este fundo da sua carteira?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await apiClient.deleteFund(fundId);
              await refetch();

              if (editingFundId === fundId) {
                resetForm();
              }
            } catch {
              Alert.alert("Fundo nao excluido", "Tente novamente antes de atualizar o rebalanceamento.");
            }
          })();
        },
      },
    ]);
  }

  function startEdit(fundId: string) {
    const fund = (funds ?? []).find((item) => item.id === fundId);

    if (!fund) {
      return;
    }

    setEditingFundId(fund.id);
    setNameInput(fund.name);
    setInitialInput(fund.initialInvestment.toString());
    setCurrentInput(fund.currentValue.toString());
    setInvestmentDateInput(fund.investmentDate.slice(0, 10));
  }

  async function handleQuickUpdateValue(fundId: string) {
    const parsedValue = parseMoney(quickValueByFundId[fundId] ?? "");

    if (parsedValue === null) {
      Alert.alert("Valor atual invalido", "Informe quanto o fundo vale hoje, sem sinal negativo.");
      return;
    }

    try {
      await apiClient.updateFundValue(fundId, parsedValue);
      await refetch();
      setQuickValueByFundId((previous) => ({ ...previous, [fundId]: "" }));
    } catch {
      Alert.alert("Valor nao atualizado", "Tente novamente antes de calcular o rebalanceamento.");
    }
  }

  return (
    <Screen
      title="Fundos"
      subtitle="Atualize fundos para que o rebalanceamento use o patrimonio correto."
      action={<PrimaryButton label={editingFundId ? "Cancelar" : "Novo fundo"} onPress={resetForm} tone="neutral" />}
    >
      <View style={styles.grid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Valor aplicado</Text>
          <Text style={styles.metricValue}>{formatCurrency(summary.totalInvested)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Valor hoje</Text>
          <Text style={styles.metricValue}>{formatCurrency(summary.currentValue)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Ganho/Perda</Text>
          <Text style={[styles.metricValue, summary.gain >= 0 ? styles.positiveText : styles.warningText]}>
            {formatSignedCurrency(summary.gain)}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Rentabilidade</Text>
          <Text style={[styles.metricValue, summary.profitability >= 0 ? styles.positiveText : styles.warningText]}>
            {formatPercentage(summary.profitability)}
          </Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingFundId ? "Editar fundo" : "Novo fundo"}</Text>
        <TextInput onChangeText={setNameInput} placeholder="Nome do fundo" placeholderTextColor={colors.textSoft} style={styles.input} value={nameInput} />
        <TextInput onChangeText={setInitialInput} placeholder="Valor aplicado (ex: 9000)" placeholderTextColor={colors.textSoft} style={styles.input} value={initialInput} />
        <TextInput onChangeText={setCurrentInput} placeholder="Valor hoje (ex: 10708.61)" placeholderTextColor={colors.textSoft} style={styles.input} value={currentInput} />
        <TextInput onChangeText={setInvestmentDateInput} placeholder="Data da aplicacao (AAAA-MM-DD)" placeholderTextColor={colors.textSoft} style={styles.input} value={investmentDateInput} />
        <PrimaryButton label={isSubmitting ? "Salvando" : editingFundId ? "Salvar fundo" : "Criar fundo"} onPress={() => void handleSubmitFund()} />
      </View>

      <View style={styles.listCard}>
        <Text style={styles.sectionLabel}>// MEUS_FUNDOS</Text>
        {isLoading ? <Text style={styles.emptyText}>Carregando fundos...</Text> : null}
        {!isLoading && (funds?.length ?? 0) === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nenhum fundo cadastrado.</Text>
            <Text style={styles.emptyHint}>Cadastre fundos para incluir esse valor no rebalanceamento.</Text>
          </View>
        ) : null}
        {(funds ?? []).map((fund) => {
          const gain = fund.currentValue - fund.initialInvestment;
          const profitability = fund.initialInvestment > 0 ? (gain / fund.initialInvestment) * 100 : 0;

          return (
            <View key={fund.id} style={styles.fundCard}>
              <View style={styles.fundHeader}>
                <View style={styles.fundIdentity}>
                  <Text style={styles.fundName}>{fund.name}</Text>
                  <Text style={styles.fundMeta}>{`Investimento: ${new Date(fund.investmentDate).toLocaleDateString("pt-BR")} · Atualizado: ${new Date(fund.updatedAt).toLocaleDateString("pt-BR")}`}</Text>
                </View>
                <View style={styles.fundActions}>
                  <PrimaryButton label="Editar" onPress={() => startEdit(fund.id)} tone="neutral" />
                  <PrimaryButton label="Excluir" onPress={() => void handleDeleteFund(fund.id)} tone="danger" />
                </View>
              </View>

              <View style={styles.fundMetricsRow}>
                <Text style={styles.fundMetric}>{`Aplicado: ${formatCurrency(fund.initialInvestment)}`}</Text>
                <Text style={styles.fundMetric}>{`Hoje: ${formatCurrency(fund.currentValue)}`}</Text>
                <Text style={[styles.fundMetric, gain >= 0 ? styles.positiveText : styles.warningText]}>
                  {`Resultado: ${formatSignedCurrency(gain)}`}
                </Text>
                <Text style={[styles.fundMetric, profitability >= 0 ? styles.positiveText : styles.warningText]}>
                  {`Retorno: ${formatPercentage(profitability)}`}
                </Text>
              </View>

              <View style={styles.quickUpdateRow}>
                <TextInput
                  onChangeText={(value) =>
                    setQuickValueByFundId((previous) => ({
                      ...previous,
                      [fund.id]: value,
                    }))
                  }
                  placeholder="Novo valor hoje"
                  placeholderTextColor={colors.textSoft}
                  style={[styles.input, styles.quickInput]}
                  value={quickValueByFundId[fund.id] ?? ""}
                />
                <PrimaryButton label="Atualizar" onPress={() => void handleQuickUpdateValue(fund.id)} />
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 10,
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.xs,
    padding: layout.space.md,
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
  positiveText: {
    color: colors.primary,
  },
  warningText: {
    color: colors.warning,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.sm,
    padding: layout.space.md,
  },
  formTitle: {
    color: colors.text,
    fontSize: typographyScale.lg.fontSize,
    fontWeight: "600",
    lineHeight: 22,
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
  listCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "700",
    letterSpacing: 0,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typographyScale.md.fontSize,
    fontWeight: typographyScale.md.fontWeight,
  },
  emptyState: {
    gap: 4,
  },
  emptyHint: {
    color: colors.textSoft,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
  fundCard: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  fundHeader: {
    gap: 10,
  },
  fundIdentity: {
    gap: 4,
  },
  fundName: {
    color: colors.text,
    fontSize: typographyScale.lg.fontSize,
    fontWeight: "600",
    lineHeight: 22,
  },
  fundMeta: {
    color: colors.textMuted,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
  fundActions: {
    flexDirection: "row",
    gap: 8,
  },
  fundMetricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  fundMetric: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
  quickUpdateRow: {
    flexDirection: "row",
    gap: 8,
  },
  quickInput: {
    flex: 1,
  },
});
