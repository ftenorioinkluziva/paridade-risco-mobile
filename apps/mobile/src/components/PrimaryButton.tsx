import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { typography } from "../theme/typography";

type PrimaryButtonProps = {
  label: string;
  icon?: ReactNode;
  onPress?: () => void;
};

export function PrimaryButton({ label, icon, onPress }: PrimaryButtonProps) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <View style={styles.content}>
        {icon ? <View>{icon}</View> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  label: {
    color: "#0F1115",
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
});
