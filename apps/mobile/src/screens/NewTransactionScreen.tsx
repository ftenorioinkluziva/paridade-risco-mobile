import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { CreateTransactionInput } from "@paridade-risco/shared";

import { InlineAlert } from "../components/InlineAlert";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { SegmentedControl } from "../components/SegmentedControl";
import { useAssetOptions } from "../hooks/useAppData";
import { formatCurrency } from "../lib/formatters";
import { apiClient } from "../services/api/client";
import { transactionTypeOptions } from "../services/mockData";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";
import type { RootStackParamList } from "../navigation/types";

export function NewTransactionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: assets } = useAssetOptions();
  const [selectedType, setSelectedType] = useState<(typeof transactionTypeOptions)[number]>("COMPRA");
  const [tickerSearch, setTickerSearch] = useState("");
  const [ticker, setTicker] = useState("");
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [quantity, setQuantity] = useState("12");
  const [price, setPrice] = useState("179.20");
  const [date, setDate] = useState("2026-04-08 09:12");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const quantityNumber = Number(quantity.replace(",", "."));
  const priceNumber = Number(price.replace(",", "."));
  const total = quantityNumber * priceNumber;
  const parsedDate = new Date(date.replace(" ", "T"));
  const isDateValid = date.trim().length > 0 && !Number.isNaN(parsedDate.getTime());
  const selectedAsset = assets?.find((item) => item.ticker === ticker);
  const tickerSearchTerm = tickerSearch.trim().toUpperCase();
  const filteredAssets = (assets ?? []).filter((item) => {
    if (!tickerSearchTerm) {
      return true;
    }

    return item.ticker.includes(tickerSearchTerm) || item.name.toUpperCase().includes(tickerSearchTerm);
  });
  const visibleAssets = tickerSearchTerm ? filteredAssets : assets ?? [];
  const visibleAssetOptions = showAllAssets ? visibleAssets.slice(0, 8) : visibleAssets.slice(0, 4);
  const errors = {
    ticker:
      ticker.trim().length === 0
        ? "Escolha um ativo da lista."
        : selectedAsset
          ? undefined
          : "Ativo nao encontrado. Selecione uma opcao da lista.",
    quantity: quantityNumber > 0 ? undefined : "Informe uma quantidade maior que zero.",
    price: priceNumber > 0 ? undefined : "Informe um preco maior que zero.",
    date: isDateValid ? undefined : "Use data e hora neste formato: 2026-04-08 09:12.",
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
      tradedAt: parsedDate.toISOString(),
    };

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      await apiClient.createTransaction(payload);
      navigation.goBack();
    } catch {
      setSubmitError("A transacao nao foi salva. Confira ativo, quantidade, preco e data.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen
      title="Nova transacao"
      subtitle="Registre uma compra ou venda para atualizar sua carteira."
      action={<PrimaryButton label="Voltar" onPress={() => navigation.goBack()} tone="neutral" />}
    >
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// TIPO_OPERACAO</Text>
        <View style={styles.typeRow}>
          <SegmentedControl
            onChange={setSelectedType}
            options={transactionTypeOptions.map((type) => ({
              label: type === "COMPRA" ? "Compra" : "Venda",
              value: type,
            }))}
            value={selectedType}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// LANCAMENTO</Text>
        <Field
          label="Buscar ticker"
          onChangeText={(value) => {
            setTickerSearch(value);
            setShowAllAssets(false);
          }}
          value={tickerSearch}
        />
        <View style={styles.assetPickerWrap}>
          {visibleAssetOptions.map((item) => {
            const isSelected = ticker === item.ticker;

            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  setTicker(item.ticker);
                  setTickerSearch(item.ticker);
                }}
                style={[styles.assetOption, isSelected ? styles.assetOptionSelected : undefined]}
              >
                <Text style={[styles.assetOptionTicker, isSelected ? styles.assetOptionTickerSelected : undefined]}>{item.ticker}</Text>
                <Text style={[styles.assetOptionName, isSelected ? styles.assetOptionNameSelected : undefined]}>{item.name}</Text>
              </Pressable>
            );
          })}
          {visibleAssets.length > visibleAssetOptions.length ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAllAssets(true)}
              style={styles.showMoreButton}
            >
              <Text style={styles.showMoreText}>{`Ver mais ${visibleAssets.length - visibleAssetOptions.length} ativo(s)`}</Text>
            </Pressable>
          ) : null}
        </View>
        {tickerSearchTerm && visibleAssets.length === 0 ? (
          <Text style={styles.helperText}>Nenhum ativo encontrado. Tente outro codigo ou nome.</Text>
        ) : null}
        {ticker ? <Text style={styles.helperText}>{`Selecionado: ${ticker}`}</Text> : null}
        {selectedAsset ? <Text style={styles.helperText}>{selectedAsset.name}</Text> : null}
        {errors.ticker ? <Text style={styles.errorText}>{errors.ticker}</Text> : null}
        <Field label="Quantidade de cotas" keyboardType="numeric" onChangeText={setQuantity} value={quantity} />
        {errors.quantity ? <Text style={styles.errorText}>{errors.quantity}</Text> : null}
        <Field label="Preco pago por cota" keyboardType="numeric" onChangeText={setPrice} value={price} />
        {errors.price ? <Text style={styles.errorText}>{errors.price}</Text> : null}
        <Field label="Data e hora da operacao" onChangeText={setDate} value={date} />
        {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>// PREVIA</Text>
        {submitError ? (
          <InlineAlert title="Transacao nao salva" message={submitError} tone="danger" />
        ) : null}
        <Text style={styles.previewValue}>{isValid ? formatCurrency(total) : "--"}</Text>
        <Text style={styles.previewText}>
          {isValid
            ? `${selectedType === "COMPRA" ? "Compra" : "Venda"} pronta para confirmacao em ${ticker}.`
            : "Preencha os campos para revisar o valor antes de salvar."}
        </Text>
        <PrimaryButton disabled={!isValid || isSubmitting} label={isSubmitting ? "Salvando" : "Salvar transacao"} onPress={handleSubmit} />
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
  typeRow: {
    gap: 10,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "600",
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
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
    marginTop: -4,
  },
  assetPickerWrap: {
    gap: 8,
  },
  assetOption: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  assetOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  showMoreButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    minHeight: layout.touch.minimum,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  showMoreText: {
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "600",
  },
  assetOptionTicker: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: "600",
  },
  assetOptionTickerSelected: {
    color: colors.commandInk,
  },
  assetOptionName: {
    color: colors.textMuted,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
  },
  assetOptionNameSelected: {
    color: colors.commandInk,
    opacity: 0.85,
  },
  errorText: {
    color: colors.warning,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: typographyScale.xs.fontWeight,
    marginTop: -6,
  },
  previewValue: {
    color: colors.primary,
    fontFamily: typography.mono,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
  },
  previewText: {
    color: colors.textMuted,
    fontSize: typographyScale.md.fontSize,
    fontWeight: typographyScale.md.fontWeight,
    lineHeight: 20,
  },
});
