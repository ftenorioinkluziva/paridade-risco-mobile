import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";

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
    borderRadius: layout.radius.md,
    borderWidth: 1,
    padding: layout.space.lg,
    gap: layout.space.sm,
  },
  content: {
    gap: layout.space.xs,
  },
  eyebrow: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: typographyScale.xs.fontSize,
    fontWeight: "600",
    letterSpacing: 0,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
  },
  detail: {
    color: colors.textMuted,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: typographyScale.sm.fontWeight,
    lineHeight: 18,
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
