import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback } from "react";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useActiveBasket, useBaskets } from "../hooks/useAppData";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

export function BasketsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: activeBasket, refetch: refetchActiveBasket } = useActiveBasket();
  const { data: baskets, refetch: refetchBaskets } = useBaskets();

  useFocusEffect(
    useCallback(() => {
      void refetchActiveBasket();
      void refetchBaskets();
    }, [refetchActiveBasket, refetchBaskets]),
  );

  return (
    <Screen
      title="Cestas"
      subtitle="Defina a alocacao alvo e acompanhe o desvio atual da carteira."
      action={<PrimaryButton label="Nova cesta" />}
    >
      <View style={styles.highlightCard}>
        <Text style={styles.highlightEyebrow}>// ACTIVE_BASKET</Text>
        <Text style={styles.highlightTitle}>{activeBasket?.name ?? "..."}</Text>
        <Text style={styles.highlightText}>{activeBasket?.description ?? "Carregando cesta ativa."}</Text>
      </View>

      <View style={styles.list}>
        <Text style={styles.sectionLabel}>// AVAILABLE_BASKETS</Text>
        {(baskets ?? []).map((item) => (
          <Pressable key={item.name} onPress={() => navigation.navigate("DetalheCesta", { basketId: item.id })} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.status}>{item.status === "ATIVA" ? "Ativa" : "Rascunho"}</Text>
            </View>
            <Text style={styles.meta}>{`${item.assetCount} ativos`}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  highlightCard: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 4,
    borderWidth: 1,
    padding: 20,
    gap: 8,
  },
  highlightEyebrow: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  highlightTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  highlightText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.92,
  },
  list: {
    gap: 12,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  name: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  status: {
    color: colors.warning,
    fontFamily: typography.mono,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
