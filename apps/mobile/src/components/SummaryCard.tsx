import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type SummaryCardProps = {
  eyebrow: string;
  title: string;
  detail: string;
  tone?: "default" | "success" | "warning";
  trailing?: ReactNode;
};

export function SummaryCard({
  eyebrow,
  title,
  detail,
  tone = "default",
  trailing,
}: SummaryCardProps) {
  return (
    <View style={[styles.card, toneStyles[tone]]}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 4,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  content: {
    gap: 6,
  },
  eyebrow: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
  },
  detail: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});

const toneStyles = StyleSheet.create({
  default: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  success: {
    backgroundColor: colors.surface,
    borderColor: colors.success,
  },
  warning: {
    backgroundColor: colors.surface,
    borderColor: colors.warning,
  },
});
