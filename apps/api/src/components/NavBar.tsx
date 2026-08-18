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
        {/* Brand */}
        <button
          onClick={() => navigate("/")}
          style={styles.brand}
        >
          <span style={styles.brandKicker}>{"//"}</span>
          <span style={styles.brandName}>PARIDADE_RISCO</span>
        </button>

        {/* Nav links */}
        <div className="app-nav-links" style={styles.links}>
          {visibleLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <button
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

        <button
          type="button"
          className="mobile-menu-toggle"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? "Fechar" : "Menu"}
        </button>

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

        {/* User area */}
        <div className="app-nav-user" style={styles.userArea}>
          {isAuthenticated && user ? (
            <>
              <span className="user-email" style={styles.userEmail}>{user.email}</span>
              <button
                onClick={() => navigate("/perfil")}
                style={styles.link}
              >
                Perfil
              </button>
              <button onClick={handleSignOut} style={styles.signOut}>
                Sair
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/login")}
              style={styles.link}
            >
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
    backgroundColor: colors.background,
    borderBottom: `1px solid ${colors.border}`,
  },
  inner: {
    display: "flex",
    alignItems: "center",
    gap: layout.space.xl,
    maxWidth: layout.contentMaxWidth,
    margin: "0 auto",
    padding: `0 ${layout.space.xl}px`,
    height: 48,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: layout.space.xs,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    color: colors.text,
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
  links: {
    display: "flex",
    alignItems: "center",
    gap: layout.space.sm,
    flex: 1,
  },
  link: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: `${layout.space.xs}px ${layout.space.sm}px`,
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 4,
    transition: "color 0.15s, background 0.15s",
  },
  linkActive: {
    color: colors.text,
    backgroundColor: colors.surface,
  },
  userArea: {
    display: "flex",
    alignItems: "center",
    gap: layout.space.sm,
  },
  userEmail: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    maxWidth: 160,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  signOut: {
    background: "none",
    border: `1px solid ${colors.border}`,
    cursor: "pointer",
    padding: `${layout.space.xxs}px ${layout.space.sm}px`,
    color: colors.danger,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 4,
  },
};
