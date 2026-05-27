import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useActiveBasket, useBaskets } from "../hooks/useAppData";
import { useStaleFocusRefetch } from "../hooks/useStaleFocusRefetch";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";

export function BasketsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data: activeBasket, refetch: refetchActiveBasket } = useActiveBasket();
  const { data: baskets, refetch: refetchBaskets } = useBaskets();
  useStaleFocusRefetch(refetchActiveBasket);
  useStaleFocusRefetch(refetchBaskets);

  return (
    <Screen
      title="Cestas"
      subtitle="Defina o alvo da carteira e compare com a posicao atual."
      action={<PrimaryButton disabled label="Em breve" tone="neutral" />}
    >
      <View style={styles.highlightCard}>
        <Text style={styles.highlightEyebrow}>// CESTA_ATIVA</Text>
        <Text style={styles.highlightTitle}>{activeBasket?.name ?? "..."}</Text>
        <Text style={styles.highlightText}>{activeBasket?.description ?? "Carregando alvo ativo."}</Text>
      </View>

      <View style={styles.list}>
        <Text style={styles.sectionLabel}>// CESTAS_DISPONIVEIS</Text>
        {(baskets?.length ?? 0) === 0 ? <Text style={styles.emptyText}>Nenhum alvo cadastrado ainda.</Text> : null}
        {(baskets ?? []).map((item) => (
          <Pressable
            key={item.name}
            onPress={() => navigation.navigate("DetalheCesta", { basketId: item.id })}
            style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : undefined]}
          >
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={[styles.status, item.status === "ATIVA" ? styles.statusActive : styles.statusDraft]}>
                {item.status === "ATIVA" ? "Ativa" : "Rascunho"}
              </Text>
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
    borderRadius: layout.radius.md,
    borderWidth: 1,
    padding: layout.space.xl,
    gap: layout.space.sm,
  },
  highlightEyebrow: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "700",
    letterSpacing: 0,
  },
  highlightTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
  },
  highlightText: {
    color: colors.text,
    fontSize: typographyScale.md.fontSize,
    fontWeight: typographyScale.md.fontWeight,
    lineHeight: 20,
    opacity: 0.92,
  },
  list: {
    gap: 12,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "700",
    letterSpacing: 0,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    gap: layout.space.xs,
    padding: layout.space.md,
  },
  cardPressed: {
    opacity: 0.9,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  name: {
    color: colors.text,
    flex: 1,
    fontSize: typographyScale.lg.fontSize,
    fontWeight: "600",
    lineHeight: 22,
  },
  status: {
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: "600",
  },
  statusActive: {
    color: colors.primary,
  },
  statusDraft: {
    color: colors.warning,
  },
  meta: {
    color: colors.textMuted,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: typographyScale.sm.fontWeight,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typographyScale.md.fontSize,
    fontWeight: typographyScale.md.fontWeight,
  },
});
