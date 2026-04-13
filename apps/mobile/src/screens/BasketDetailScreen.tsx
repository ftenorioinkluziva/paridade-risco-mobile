import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";

import type { UpdateBasketInput } from "@paridade-risco/shared";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import type { BasketAllocationItem } from "../domain/models";
import { useBasketDetail } from "../hooks/useAppData";
import { useStaleFocusRefetch } from "../hooks/useStaleFocusRefetch";
import { formatPercentage } from "../lib/formatters";
import type { RootStackParamList } from "../navigation/types";
import { apiClient } from "../services/api/client";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";

type BasketDetailRoute = NativeStackScreenProps<RootStackParamList, "DetalheCesta">["route"];

export function BasketDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<BasketDetailRoute>();
  const { data, isLoading, refetch } = useBasketDetail(route.params.basketId);
  const [name, setName] = useState("");
  const [allocations, setAllocations] = useState<Array<BasketAllocationItem & { value: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!data) {
      return;
    }

    setName(data.name);
    setAllocations(data.allocations.map((item) => ({ ...item, value: String(item.targetPercentage) })));
  }, [data]);
  useStaleFocusRefetch(refetch);

  const total = allocations.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const hasInvalidAllocation = allocations.some((item) => Number(item.value) < 0 || Number.isNaN(Number(item.value)));
  const isValid = Math.abs(total - 100) < 0.01 && name.trim().length > 0 && !hasInvalidAllocation;
  const isOverAllocated = total > 100.01;

  function normalizePercentageInput(rawValue: string) {
    const cleaned = rawValue.replace(",", ".").replace(/[^0-9.]/g, "");

    if (!cleaned) {
      return "";
    }

    const [integerPart, ...decimalParts] = cleaned.split(".");
    const normalizedInteger = integerPart.replace(/^0+(?=\d)/, "");
    const normalized = decimalParts.length > 0
      ? `${normalizedInteger}.${decimalParts.join("").slice(0, 2)}`
      : normalizedInteger;
    const numericValue = Number(normalized);

    if (!Number.isFinite(numericValue)) {
      return "";
    }

    if (numericValue > 100) {
      return "100";
    }

    return normalized;
  }

  function formatPercentageOnBlur(rawValue: string) {
    const normalized = normalizePercentageInput(rawValue);

    if (!normalized) {
      return "0.00";
    }

    const numericValue = Number(normalized);

    if (!Number.isFinite(numericValue)) {
      return "0.00";
    }

    return numericValue.toFixed(2);
  }

  async function handleSave() {
    if (!isValid || isSaving) {
      return;
    }

    const payload: UpdateBasketInput = {
      name: name.trim(),
      allocations: allocations.map((item) => ({
        assetTicker: item.ticker,
        targetPercentage: Number(item.value),
      })),
    };

    try {
      setIsSaving(true);
      const updated = await apiClient.updateBasket(route.params.basketId, payload);
      setName(updated.name);
      setAllocations(updated.allocations.map((item) => ({ ...item, value: String(item.targetPercentage) })));
      Alert.alert("Cesta atualizada", "A composicao alvo foi salva com sucesso.");
    } catch {
      Alert.alert("Falha ao salvar", "Nao foi possivel atualizar a cesta na API.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen
      title="Detalhe da cesta"
      subtitle="Edicao enxuta da composicao alvo para manter a carteira alinhada ao plano."
      action={<PrimaryButton label="Voltar" onPress={() => navigation.goBack()} />}
    >
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// DADOS_CESTA</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nome da cesta" placeholderTextColor={colors.textSoft} />
        <Text style={styles.description}>{isLoading ? "Carregando detalhes da cesta." : data?.description}</Text>
      </View>

      <View style={styles.targetSection}>
        <View style={styles.summaryRow}>
          <Text style={styles.sectionLabel}>// ALOCACAO_ALVO</Text>
          <Text style={[styles.totalValue, isValid ? styles.valid : styles.invalid]}>{formatPercentage(total)}</Text>
        </View>
        {allocations.map((item, index) => (
          <View key={item.id} style={styles.allocationCard}>
            <View style={styles.allocationTopRow}>
              <View style={styles.allocationHeader}>
                <Text style={styles.ticker}>{item.ticker}</Text>
                <Text style={styles.assetName}>{item.name}</Text>
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  keyboardType="numeric"
                  maxLength={6}
                  onChangeText={(value) => {
                    const normalizedValue = normalizePercentageInput(value);

                    setAllocations((current) =>
                      current.map((entry, currentIndex) =>
                        currentIndex === index ? { ...entry, value: normalizedValue } : entry,
                      ),
                    );
                  }}
                  onBlur={() => {
                    setAllocations((current) =>
                      current.map((entry, currentIndex) =>
                        currentIndex === index ? { ...entry, value: formatPercentageOnBlur(entry.value) } : entry,
                      ),
                    );
                  }}
                  style={styles.percentageInput}
                  value={item.value}
                />
                <Text style={styles.percentSymbol}>%</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  isOverAllocated ? styles.progressFillWarning : null,
                  { width: `${Math.max(0, Math.min(Number(item.value) || 0, 100))}%` },
                ]}
              />
            </View>
          </View>
        ))}
        <Text style={[styles.validationText, isValid ? styles.valid : styles.invalid]}>
          {isValid ? "Total valido para salvar." : "A soma precisa fechar em 100%."}
        </Text>
        <PrimaryButton label={isSaving ? "Salvando" : "Salvar composicao"} onPress={handleSave} />
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
    padding: layout.space.md,
  },
  targetSection: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.sm,
    padding: layout.space.md,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "700",
    letterSpacing: 0,
  },
  input: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: layout.touch.minimum,
    paddingHorizontal: layout.space.md,
  },
  description: {
    color: colors.textMuted,
    fontSize: typographyScale.md.fontSize,
    fontWeight: typographyScale.md.fontWeight,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalValue: {
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: "600",
  },
  valid: {
    color: colors.primary,
  },
  invalid: {
    color: colors.warning,
  },
  allocationCard: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.xs,
    padding: layout.space.sm,
  },
  allocationTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: layout.space.sm,
    justifyContent: "space-between",
  },
  allocationHeader: {
    flex: 1,
    gap: 1,
  },
  ticker: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: typographyScale.lg.fontSize,
    fontWeight: "600",
    lineHeight: 22,
  },
  assetName: {
    color: colors.textMuted,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
  inputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: layout.space.xxs,
  },
  percentageInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: typographyScale.xs.fontSize,
    height: 35,
    width: 38,
    paddingHorizontal: 2,
    textAlign: "right",
  },
  percentSymbol: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: "700",
  },
  validationText: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressTrack: {
    backgroundColor: colors.surface,
    borderRadius: 2,
    height: 8,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: colors.primary,
    height: "100%",
  },
  progressFillWarning: {
    backgroundColor: colors.warning,
  },
});
