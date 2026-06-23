"use client";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: "primary" | "neutral" | "danger";
};

export function PrimaryButton({ label, onPress, disabled = false, tone = "primary" }: Props) {
  const isNeutral = tone === "neutral";
  const isDanger = tone === "danger";

  const btnStyle: React.CSSProperties = {
    ...styles.base,
    backgroundColor: isDanger ? colors.danger : isNeutral ? colors.surfaceAlt : colors.primary,
    borderColor: isDanger ? colors.danger : isNeutral ? colors.border : colors.primaryStrong,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };

  const labelStyle: React.CSSProperties = {
    ...styles.label,
    color: isNeutral ? colors.text : isDanger ? colors.text : colors.commandInk,
  };

  return (
    <button style={btnStyle} disabled={disabled} onClick={onPress}>
      <span style={labelStyle}>{label}</span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    minHeight: layout.touch.minimum,
    padding: `${layout.space.xxs}px ${layout.space.sm}px`,
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: "16px",
    gap: 6,
    transition: "opacity 0.15s",
  },
  label: {
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: "16px",
  },
};