import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { CreateTransactionInput } from "@paridade-risco/shared";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAssetOptions } from "../hooks/useAppData";
import { formatCurrency } from "../lib/formatters";
import { apiClient } from "../services/api/client";
import { transactionTypeOptions } from "../services/mockData";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import type { RootStackParamList } from "../navigation/types";

export function NewTransactionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: assets } = useAssetOptions();
  const [selectedType, setSelectedType] = useState<(typeof transactionTypeOptions)[number]>("COMPRA");
  const [ticker, setTicker] = useState("IVVB11");
  const [quantity, setQuantity] = useState("12");
  const [price, setPrice] = useState("179.20");
  const [date, setDate] = useState("2026-04-08 09:12");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quantityNumber = Number(quantity.replace(",", "."));
  const priceNumber = Number(price.replace(",", "."));
  const total = quantityNumber * priceNumber;
  const selectedAsset = assets?.find((item) => item.ticker === ticker);
  const errors = {
    ticker: ticker.trim().length === 0 ? "Informe um ticker." : selectedAsset ? undefined : "Ticker nao encontrado.",
    quantity: quantityNumber > 0 ? undefined : "Quantidade deve ser maior que zero.",
    price: priceNumber > 0 ? undefined : "Preco deve ser maior que zero.",
    date: date.trim().length === 0 ? "Informe a data da operacao." : undefined,
  };
  const isValid = !errors.ticker && !errors.quantity && !errors.price && !errors.date;

  async function handleSubmit() {
    if (!isValid || isSubmitting) {
      return;
    }

    const payload: CreateTransactionInput = {
      assetTicker: ticker.trim().toUpperCase(),
      type: selectedType,
      shares: quantityNumber,
      pricePerShare: priceNumber,
      tradedAt: new Date(date.replace(" ", "T")).toISOString(),
    };

    try {
      setIsSubmitting(true);
      await apiClient.createTransaction(payload);
      Alert.alert("Transacao registrada", `${selectedType === "COMPRA" ? "Compra" : "Venda"} enviada com sucesso.`);
      navigation.goBack();
    } catch {
      Alert.alert("Falha ao salvar", "Nao foi possivel registrar a transacao na API.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen
      title="Nova transacao"
      subtitle="Fluxo enxuto para registrar compra ou venda sem sair da rotina mobile."
      action={<PrimaryButton label="Voltar" onPress={() => navigation.goBack()} />}
    >
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// TRANSACTION_TYPE</Text>
        <View style={styles.typeRow}>
          {transactionTypeOptions.map((type) => {
            const isSelected = selectedType === type;

            return (
              <Pressable
                key={type}
                onPress={() => setSelectedType(type)}
                style={[styles.typeButton, isSelected ? styles.typeButtonSelected : undefined]}
              >
                <Text style={[styles.typeButtonText, isSelected ? styles.typeButtonTextSelected : undefined]}>
                  {type === "COMPRA" ? "Compra" : "Venda"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// ORDER_INPUT</Text>
        <Field label="Ticker" onChangeText={(value) => setTicker(value.toUpperCase())} value={ticker} />
        {selectedAsset ? <Text style={styles.helperText}>{selectedAsset.name}</Text> : null}
        {errors.ticker ? <Text style={styles.errorText}>{errors.ticker}</Text> : null}
        <Field label="Quantidade" keyboardType="numeric" onChangeText={setQuantity} value={quantity} />
        {errors.quantity ? <Text style={styles.errorText}>{errors.quantity}</Text> : null}
        <Field label="Preco por cota" keyboardType="numeric" onChangeText={setPrice} value={price} />
        {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
        <Field label="Data" onChangeText={setDate} value={date} />
        {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// PREVIEW</Text>
        <Text style={styles.previewValue}>{isValid ? formatCurrency(total) : "--"}</Text>
        <Text style={styles.previewText}>
          {isValid
            ? `${selectedType === "COMPRA" ? "Compra" : "Venda"} pronta para confirmacao em ${ticker}.`
            : "Preencha os campos obrigatorios para gerar o preview da operacao."}
        </Text>
        <PrimaryButton label={isSubmitting ? "Enviando" : "Confirmar transacao"} onPress={handleSubmit} />
      </View>
    </Screen>
  );
}

type FieldProps = {
  label: string;
  keyboardType?: "default" | "numeric";
  onChangeText: (value: string) => void;
  value: string;
};

function Field({ label, keyboardType = "default", onChangeText, value }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput keyboardType={keyboardType} onChangeText={onChangeText} style={styles.fieldInput} value={value} />
    </View>
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
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeButton: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  typeButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
  },
  typeButtonTextSelected: {
    color: "#0F1115",
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
  },
  fieldInput: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: -4,
  },
  errorText: {
    color: colors.warning,
    fontSize: 13,
    marginTop: -6,
  },
  previewValue: {
    color: colors.primary,
    fontFamily: typography.mono,
    fontSize: 24,
    fontWeight: "700",
  },
  previewText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
