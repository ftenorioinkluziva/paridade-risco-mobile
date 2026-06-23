"use client";

import type { ReactNode } from "react";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

type Props = {
  eyebrow: string;
  title: string;
  detail: string;
  tone?: "default" | "success" | "warning";
  trailing?: ReactNode;
};

export function SummaryCard({ eyebrow, title, detail, tone = "default", trailing }: Props) {
  const borderColor = tone === "success" ? colors.primary : tone === "warning" ? colors.warning : colors.border;

  return (
    <div style={{ ...styles.card, borderColor }}>
      <div style={styles.content}>
        <div style={styles.eyebrow}>{eyebrow}</div>
        <div style={{ ...styles.title, color: tone === "success" ? colors.primary : colors.text }}>{title}</div>
        <div style={styles.detail}>{detail}</div>
      </div>
      {trailing ? <div>{trailing}</div> : null}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    padding: layout.space.lg,
    display: "flex",
    gap: layout.space.sm,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  content: { display: "flex", flexDirection: "column", gap: 4 },
  eyebrow: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: 600,
    lineHeight: "32px",
    fontFamily: typography.mono,
  },
  detail: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: "16px",
    fontFamily: typography.mono,
  },
};