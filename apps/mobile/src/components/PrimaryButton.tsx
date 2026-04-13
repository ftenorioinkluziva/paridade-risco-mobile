import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";

type PrimaryButtonProps = {
  label: string;
  icon?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  tone?: "primary" | "neutral" | "danger";
};

export function PrimaryButton({ label, icon, onPress, disabled = false, tone = "primary" }: PrimaryButtonProps) {
  const toneStyle = tone === "neutral" ? styles.buttonNeutral : tone === "danger" ? styles.buttonDanger : undefined;
  const labelToneStyle = tone === "neutral" ? styles.labelNeutral : tone === "danger" ? styles.labelDanger : undefined;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, toneStyle, pressed ? styles.buttonPressed : undefined, disabled ? styles.buttonDisabled : undefined]}
    >
      <View style={styles.content}>
        {icon ? <View>{icon}</View> : null}
        <Text style={[styles.label, labelToneStyle, disabled ? styles.labelDisabled : undefined]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    alignItems: "center",
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderColor: colors.primaryStrong,
    justifyContent: "center",
    minHeight: layout.touch.minimum,
    paddingHorizontal: layout.space.sm,
    paddingVertical: layout.space.xxs,
  },
  buttonNeutral: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    backgroundColor: colors.textSoft,
    borderColor: colors.textSoft,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: layout.space.xs,
    justifyContent: "center",
  },
  label: {
    color: "#0F1115",
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: typographyScale.sm.fontWeight,
    lineHeight: typographyScale.sm.lineHeight,
    letterSpacing: typographyScale.sm.letterSpacing,
  },
  labelNeutral: {
    color: colors.text,
  },
  labelDanger: {
    color: colors.text,
  },
  labelDisabled: {
    color: "#0F1115",
    opacity: 0.7,
  },
});
