"use client";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { PrimaryButton } from "./PrimaryButton";

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "warning" | "danger" | "success";
};

export function InlineAlert({ title, message, actionLabel, onAction, tone = "warning" }: Props) {
  const toneColor = tone === "danger" ? colors.danger : tone === "success" ? colors.success : colors.warning;

  return (
    <div
      role="alert"
      style={{
        ...styles.alert,
        borderColor: toneColor,
      }}
    >
      <div style={styles.content}>
        <div style={{ ...styles.title, color: toneColor }}>{title}</div>
        <div style={styles.message}>{message}</div>
      </div>
      {actionLabel && onAction ? (
        <div style={styles.action}>
          <PrimaryButton label={actionLabel} onPress={onAction} tone="neutral" />
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  alert: {
    backgroundColor: colors.accentPanel,
    borderRadius: layout.radius.sm,
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    gap: layout.space.md,
    padding: layout.space.md,
  },
  content: { display: "flex", flexDirection: "column", gap: layout.space.xs },
  title: {
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 700,
  },
  message: {
    color: colors.text,
    fontSize: 12,
    lineHeight: "18px",
  },
  action: { alignSelf: "flex-start" },
};