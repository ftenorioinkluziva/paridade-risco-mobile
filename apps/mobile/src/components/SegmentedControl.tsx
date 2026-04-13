import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { layout } from "../theme/layout";
import { typography, typographyScale } from "../theme/typography";

type SegmentedOption<T extends string | number> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string | number> = {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string | number>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.button,
              isActive ? styles.buttonActive : undefined,
              pressed ? styles.buttonPressed : undefined,
            ]}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : undefined]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: layout.space.sm,
  },
  button: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    flex: 1,
    minHeight: layout.touch.minimum,
    justifyContent: "center",
    paddingHorizontal: layout.space.md,
  },
  buttonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  label: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: typographyScale.sm.fontSize,
    fontWeight: typographyScale.sm.fontWeight,
    textAlign: "center",
  },
  labelActive: {
    color: "#0F1115",
  },
});
