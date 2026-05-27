import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type BadgeVariant = "buy" | "sell";

const VARIANT_MAP: Record<string, BadgeVariant> = {
  COMPRA: "buy",
  APORTAR: "buy",
  COMPRAR: "buy",
  VENDA: "sell",
  RETIRAR: "sell",
  VENDER: "sell",
};

type Props = {
  label: string;
  variant?: BadgeVariant;
};

export function TypeBadge({ label, variant }: Props) {
  const resolved = variant ?? VARIANT_MAP[label] ?? "buy";
  const isBuy = resolved === "buy";

  return (
    <View style={[styles.badge, isBuy ? styles.badgeBuy : styles.badgeSell]}>
      <Text style={[styles.badgeText, isBuy ? styles.badgeBuyText : styles.badgeSellText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeBuy: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderColor: "rgba(59, 130, 246, 0.4)",
    borderWidth: 1,
  },
  badgeSell: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: typography.mono,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  badgeBuyText: {
    color: colors.buyBlue,
  },
  badgeSellText: {
    color: colors.warning,
  },
});
