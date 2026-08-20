import Link from "next/link";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";

export function LandingPage() {
  return (
    <div style={styles.outer}>
      <NavBar />
      <div style={styles.inner}>
        <div style={styles.hero}>
          <div style={styles.kicker}>// PARIDADE_RISCO</div>
          <h1 style={styles.title}>Carteira com lastro</h1>
          <p style={styles.subtitle}>
            Conecte suas instituições, entenda sua saúde financeira e tome
            decisões de investimento com a metodologia de Paridade de Risco.
          </p>
          <div style={styles.actions}>
            <Link
              href="/login"
              style={{ ...styles.primaryButton, textDecoration: "none", display: "inline-block" }}
            >
              Entrar na plataforma
            </Link>
          </div>
        </div>

        <div style={styles.features}>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>📊</span>
            <h3 style={styles.featureTitle}>Resumo Financeiro</h3>
            <p style={styles.featureDesc}>
              Patrimônio, caixa, cartões, obrigações e alertas em uma visão
              rápida do que importa.
            </p>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>🔄</span>
            <h3 style={styles.featureTitle}>Carteira conectada</h3>
            <p style={styles.featureDesc}>
              Veja os investimentos observados, a aderência à cesta e o plano
              de rebalanceamento.
            </p>
          </div>
          <div style={styles.feature}>
            <span style={styles.featureIcon}>📋</span>
            <h3 style={styles.featureTitle}>Saúde Financeira</h3>
            <p style={styles.featureDesc}>
              Entenda fluxo de caixa, cartão e empréstimos antes de investir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reuse NavBar at top but without requiring auth
function NavBar() {
  return (
    <nav style={styles.navWrapper}>
      <div style={styles.navInner}>
        <div style={styles.brand}>
          <span style={styles.brandKicker}>//</span>
          <span style={styles.brandName}>PARIDADE_RISCO</span>
        </div>
        <Link
          href="/login"
          style={{ ...styles.loginLink, textDecoration: "none", display: "inline-block" }}
        >
          Entrar
        </Link>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  outer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: colors.background,
  },
  navWrapper: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    width: "100%",
    backgroundColor: colors.background,
    borderBottom: `1px solid ${colors.border}`,
  },
  navInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: layout.contentMaxWidth,
    margin: "0 auto",
    padding: `0 ${layout.space.xl}px`,
    height: 48,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: layout.space.xs,
  },
  brandKicker: {
    color: colors.primary,
    fontFamily: typography.mono,
    fontSize: 13,
    fontWeight: 700,
  },
  brandName: {
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: colors.textMuted,
  },
  loginLink: {
    background: "none",
    border: `1px solid ${colors.border}`,
    cursor: "pointer",
    padding: `${layout.space.xs}px ${layout.space.lg}px`,
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 4,
    transition: "background 0.15s",
  },
  inner: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.xxxl,
    maxWidth: layout.contentMaxWidth,
    padding: `${layout.space.xxxl}px ${layout.space.xl}px`,
    width: "100%",
  },
  hero: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.lg,
    paddingTop: layout.space.xxxl,
  },
  kicker: {
    color: colors.primary,
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: 700,
    margin: 0,
    lineHeight: "48px",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: "24px",
    margin: 0,
    maxWidth: 540,
  },
  actions: {
    display: "flex",
    gap: layout.space.md,
    marginTop: layout.space.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    color: colors.commandInk,
    border: "none",
    cursor: "pointer",
    padding: `${layout.space.md}px ${layout.space.xxl}px`,
    fontFamily: typography.mono,
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 6,
    transition: "opacity 0.15s",
  },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: layout.space.lg,
  },
  feature: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: layout.space.xl,
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
  },
  featureIcon: {
    fontSize: 24,
    lineHeight: 1,
  },
  featureTitle: {
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 13,
    fontWeight: 600,
    margin: 0,
  },
  featureDesc: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: "18px",
    margin: 0,
  },
};
