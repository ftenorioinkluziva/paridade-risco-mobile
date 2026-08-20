"use client";

import type { ReactNode } from "react";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { NavBar } from "./NavBar";

type ScreenProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
  hideNav?: boolean;
  width?: keyof typeof layout.contentWidths;
};

export function Screen({ title, subtitle, action, children, hideNav, width = "standard" }: ScreenProps) {
  return (
    <div className="app-shell" style={styles.outer}>
      {!hideNav ? <NavBar /> : null}
      <main className={`screen-inner screen-inner--${width}`} style={{ ...styles.inner, maxWidth: layout.contentWidths[width] }}>
        <div className="screen-header" style={styles.header}>
          <div className="screen-title-block" style={styles.titleBlock}>
            <div style={styles.kicker}>// PARIDADE_RISCO</div>
            <h1 style={styles.title}>{title}</h1>
            <p style={styles.subtitle}>{subtitle}</p>
          </div>
          {action ? <div className="screen-action">{action}</div> : null}
        </div>
        {children}
      </main>
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
