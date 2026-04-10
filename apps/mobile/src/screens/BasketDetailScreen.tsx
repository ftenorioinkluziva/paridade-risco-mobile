import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";

import type { UpdateBasketInput } from "@paridade-risco/shared";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import type { BasketAllocationItem } from "../domain/models";
import { useBasketDetail } from "../hooks/useAppData";
import { formatPercentage } from "../lib/formatters";
import type { RootStackParamList } from "../navigation/types";
import { apiClient } from "../services/api/client";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

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

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const total = allocations.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const hasInvalidAllocation = allocations.some((item) => Number(item.value) < 0 || Number.isNaN(Number(item.value)));
  const isValid = Math.abs(total - 100) < 0.01 && name.trim().length > 0 && !hasInvalidAllocation;

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
        <Text style={styles.sectionLabel}>// BASKET_HEADER</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nome da cesta" placeholderTextColor={colors.textSoft} />
        <Text style={styles.description}>{isLoading ? "Carregando detalhes da cesta." : data?.description}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.summaryRow}>
          <Text style={styles.sectionLabel}>// TARGET_ALLOCATION</Text>
          <Text style={[styles.totalValue, isValid ? styles.valid : styles.invalid]}>{formatPercentage(total)}</Text>
        </View>
        {allocations.map((item, index) => (
          <View key={item.id} style={styles.allocationCard}>
            <View style={styles.allocationHeader}>
              <Text style={styles.ticker}>{item.ticker}</Text>
              <Text style={styles.assetName}>{item.name}</Text>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                keyboardType="numeric"
                onChangeText={(value) => {
                  setAllocations((current) =>
                    current.map((entry, currentIndex) =>
                      currentIndex === index ? { ...entry, value } : entry,
                    ),
                  );
                }}
                style={styles.percentageInput}
                value={item.value}
              />
              <Text style={styles.percentSymbol}>%</Text>
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
  input: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalValue: {
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: "700",
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
    borderRadius: 4,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  allocationHeader: {
    gap: 4,
  },
  ticker: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 15,
    fontWeight: "700",
  },
  assetName: {
    color: colors.textMuted,
    fontSize: 13,
  },
  inputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  percentageInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  percentSymbol: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: "700",
  },
  validationText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
