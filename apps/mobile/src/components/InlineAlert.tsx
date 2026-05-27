import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";
import { PrimaryButton } from "./PrimaryButton";

type InlineAlertProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "warning" | "danger";
};

export function InlineAlert({ title, message, actionLabel, onAction, tone = "warning" }: InlineAlertProps) {
  const isDanger = tone === "danger";

  return (
    <View
      accessibilityRole="alert"
      style={[styles.alert, isDanger ? styles.alertDanger : styles.alertWarning]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, isDanger ? styles.titleDanger : styles.titleWarning]}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <PrimaryButton label={actionLabel} onPress={onAction} tone="neutral" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  alert: {
    backgroundColor: colors.accentPanel,
    borderRadius: layout.radius.sm,
    borderWidth: 1,
    gap: layout.space.md,
    padding: layout.space.md,
  },
  alertWarning: {
    borderColor: colors.warning,
  },
  alertDanger: {
    borderColor: colors.danger,
  },
  content: {
    gap: layout.space.xs,
  },
  title: {
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: "700",
  },
  titleWarning: {
    color: colors.warning,
  },
  titleDanger: {
    color: colors.danger,
  },
  message: {
    color: colors.text,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: typographyScale.sm.fontWeight,
    lineHeight: 18,
  },
  action: {
    alignSelf: "flex-start",
  },
});
