import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback } from "react";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useTransactions } from "../hooks/useAppData";
import { formatCurrency } from "../lib/formatters";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export function TransactionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, error, isLoading, refetch } = useTransactions();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  return (
    <Screen
      title="Transacoes"
      subtitle="Registro rapido de compras e vendas com historico recente."
      action={<PrimaryButton label="Nova transacao" onPress={() => navigation.navigate("NovaTransacao")} />}
    >
      <View style={styles.list}>
        <Text style={styles.sectionLabel}>// LATEST_TRANSACTIONS</Text>
        {(data ?? []).map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{`${item.type === "COMPRA" ? "Compra" : "Venda"} ${item.assetTicker}`}</Text>
              <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.meta}>{`${item.assetName} · ${item.dateLabel}`}</Text>
              <Text style={styles.badge}>{item.type === "COMPRA" ? "Compra" : "Venda"}</Text>
            </View>
          </View>
        ))}
        {isLoading ? <Text style={styles.loading}>Carregando transacoes...</Text> : null}
        {error ? <Text style={styles.loading}>Falha ao carregar transacoes.</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  amount: {
    color: colors.primary,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  badge: {
    color: colors.warning,
    fontFamily: typography.mono,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  loading: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
});
