"use client";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

type Props = { value: string; onChange: (v: string) => void; type?: string; placeholder?: string };

export function InputField({ value, onChange, type = "text", placeholder }: Props) {
  return (
    <input
      style={styles.input}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  input: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: "solid",
    color: colors.text,
    minHeight: 48,
    padding: "0 14px",
    fontFamily: typography.mono,
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  },
};