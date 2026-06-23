"use client";

import type { ReactNode } from "react";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

type ScreenProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Screen({ title, subtitle, action, children }: ScreenProps) {
  return (
    <div style={styles.outer}>
      <div style={styles.inner}>
        <div style={styles.header}>
          <div style={styles.titleBlock}>
            <div style={styles.kicker}>// PARIDADE_RISCO</div>
            <h1 style={styles.title}>{title}</h1>
            <p style={styles.subtitle}>{subtitle}</p>
          </div>
          {action ? <div>{action}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  outer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingBottom: layout.space.xxxl,
    minHeight: "100vh",
  },
  inner: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.lg,
    maxWidth: layout.contentMaxWidth,
    padding: `${layout.space.xl}px ${layout.space.xl}px 0`,
    width: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: layout.space.md,
  },
  titleBlock: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.xs,
  },
  kicker: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: "20px",
    margin: 0,
  },
};