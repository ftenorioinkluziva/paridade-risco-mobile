"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { useAuth } from "@/context/AuthContext";

export type NavLink = {
  label: string;
  path: string;
  authRequired: boolean;
};

const NAV_LINKS: NavLink[] = [
  { label: "Resumo", path: "/", authRequired: true },
  { label: "Saúde financeira", path: "/saude-financeira", authRequired: true },
  { label: "Investimentos", path: "/investimentos", authRequired: true },
  { label: "Cotações", path: "/cotacoes", authRequired: true },
  { label: "Cestas", path: "/cestas", authRequired: true },
];

export const ADMIN_NAV_LINKS: NavLink[] = [
  { label: "Dados conectados", path: "/pluggy", authRequired: true },
  { label: "Eventos de sincronização", path: "/pluggy-eventos", authRequired: true },
];

export function NavBar() {
  const { user, isAuthenticated, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hide NavBar on login page
  if (pathname === "/login") return null;

  const visibleLinks = NAV_LINKS.filter(
    (link) => !link.authRequired || isAuthenticated
  );

  function navigate(path: string) {
    setMobileMenuOpen(false);
    router.push(path);
  }

  async function handleSignOut() {
    setMobileMenuOpen(false);
    await signOut();
    router.push("/login");
  }

  return (
    <nav className="app-nav" style={styles.wrapper}>
      <div className="app-nav-inner" style={styles.inner}>
        {/* Left Section: Brand + Links */}
        <div style={styles.leftGroup}>
          <button
            type="button"
            className="app-nav-control"
            onClick={() => navigate("/")}
            style={styles.brand}
            title="Paridade de Risco"
          >
            <span style={styles.brandKicker}>{"//"}</span>
            <span style={styles.brandName}>PARIDADE_RISCO</span>
          </button>

          {/* Desktop Nav links */}
          <div className="app-nav-links" style={styles.links}>
            {visibleLinks.map((link) => {
              const isActive = pathname === link.path;
              return (
                <button
                  type="button"
                  className="app-nav-control"
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  style={{
                    ...styles.link,
                    ...(isActive ? styles.linkActive : {}),
                  }}
                >
                  {link.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="mobile-menu-toggle"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? "Fechar" : "Menu"}
        </button>

        {/* Desktop User area */}
        <div className="app-nav-user" style={styles.userArea}>
          {isAuthenticated && user ? (
            <>
              <button
                type="button"
                className="app-nav-control"
                onClick={() => navigate("/perfil")}
                style={{
                  ...styles.link,
                  ...(pathname === "/perfil" ? styles.linkActive : {}),
                }}
              >
                Perfil
              </button>
              <button type="button" className="app-nav-control" onClick={handleSignOut} style={styles.signOut}>
                Sair
              </button>
            </>
          ) : (
            <button
              type="button"
              className="app-nav-control"
              onClick={() => navigate("/login")}
              style={styles.loginBtn}
            >
              Entrar
            </button>
          )}
        </div>

        {/* Mobile Navigation Panel */}
        <div
          id="mobile-navigation"
          className="mobile-navigation-panel"
          hidden={!mobileMenuOpen}
        >
          {visibleLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <button
                key={link.path}
                type="button"
                className={isActive ? "mobile-navigation-link is-active" : "mobile-navigation-link"}
                aria-current={isActive ? "page" : undefined}
                onClick={() => navigate(link.path)}
              >
                {link.label}
              </button>
            );
          })}
          {isAuthenticated && user ? (
            <>
              <button
                type="button"
                className={pathname === "/perfil" ? "mobile-navigation-link is-active" : "mobile-navigation-link"}
                aria-current={pathname === "/perfil" ? "page" : undefined}
                onClick={() => navigate("/perfil")}
              >
                Perfil
              </button>
              <button type="button" className="mobile-navigation-link is-danger" onClick={handleSignOut}>
                Sair
              </button>
            </>
          ) : (
            <button type="button" className="mobile-navigation-link" onClick={() => navigate("/login")}>
              Entrar
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    width: "100%",
    backgroundColor: "rgba(22, 23, 27, 0.95)",
    backdropFilter: "blur(12px)",
    borderBottom: `1px solid ${colors.border}`,
  },
  inner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: layout.space.md,
    maxWidth: layout.contentWidths.wide,
    margin: "0 auto",
    padding: "0 24px",
    height: 52,
  },
  leftGroup: {
    display: "flex",
    alignItems: "center",
    gap: layout.space.lg,
    flex: 1,
    minWidth: 0,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    cursor: "pointer",
    minHeight: layout.touch.minimum,
    padding: "4px 8px",
    flexShrink: 0,
    color: colors.text,
  },
  brandKicker: {
    color: colors.primary,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: 700,
  },
  brandName: {
    fontFamily: typography.mono,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.6,
    color: colors.text,
  },
  links: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    whiteSpace: "nowrap",
    overflowX: "auto",
    scrollbarWidth: "none",
  },
  link: {
    background: "none",
    border: "none",
    cursor: "pointer",
    minHeight: layout.touch.minimum,
    padding: "6px 12px",
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 6,
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "color 0.15s, background 0.15s",
  },
  linkActive: {
    color: "#FFFFFF",
    backgroundColor: colors.surfaceAlt,
    fontWeight: 600,
  },
  userArea: {
    display: "flex",
    alignItems: "center",
    gap: layout.space.sm,
    flexShrink: 0,
  },
  signOut: {
    background: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.25)",
    cursor: "pointer",
    minHeight: layout.touch.minimum,
    padding: "4px 12px",
    color: "#F87171",
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 4,
    whiteSpace: "nowrap",
  },
  loginBtn: {
    background: colors.primary,
    border: "none",
    cursor: "pointer",
    minHeight: layout.touch.minimum,
    padding: "6px 14px",
    color: "#000",
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 4,
    whiteSpace: "nowrap",
  },
};
