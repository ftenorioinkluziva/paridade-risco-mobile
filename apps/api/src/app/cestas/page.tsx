"use client";

import { useRouter } from "next/navigation";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { Screen } from "@/components/Screen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useBaskets } from "@/context/AuthContext";

export default function CestasPage() {
  const router = useRouter();
  const { data: baskets, isLoading, error } = useBaskets();

  return (
    <Screen
      title="Cestas"
      subtitle="Defina o alvo da carteira e compare com a posicao atual."
      action={
        <PrimaryButton
          label="Nova cesta"
          onPress={() => router.push("/cestas/nova")}
        />
      }
    >
      {/* Error state */}
      {error ? (
        <div style={styles.errorCard}>
          <span style={styles.errorTitle}>Erro ao carregar cestas</span>
          <span style={styles.errorText}>{error}</span>
        </div>
      ) : null}

      {/* Loading state */}
      {isLoading && !error ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyTitle}>Carregando cestas...</span>
        </div>
      ) : null}

      {/* Empty state */}
      {!isLoading && !error && (baskets?.length ?? 0) === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyTitle}>Nenhum alvo cadastrado ainda.</span>
          <span style={styles.emptyText}>
            Crie sua primeira cesta para definir a alocação alvo da carteira.
          </span>
        </div>
      ) : null}

      {/* Basket list */}
      {!isLoading && (baskets?.length ?? 0) > 0 ? (
        <div style={styles.list}>
          <div style={styles.sectionLabel}>// CESTAS_DISPONIVEIS</div>
          {baskets!.map((item: any) => (
            <button
              key={item.id ?? item.name}
              onClick={() => router.push(`/cestas/${item.id}`)}
              style={styles.card}
            >
              <div style={styles.row}>
                <span style={styles.name}>{item.name}</span>
                <span
                  style={{
                    ...styles.status,
                    color:
                      item.status === "ATIVA"
                        ? colors.primary
                        : colors.warning,
                  }}
                >
                  {item.status === "ATIVA" ? "Ativa" : "Rascunho"}
                </span>
              </div>
              <span style={styles.meta}>{`${item.assetCount} ativos`}</span>
            </button>
          ))}
        </div>
      ) : null}
    </Screen>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  card: {
    all: "unset",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: layout.space.xs,
    padding: layout.space.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    transition: "opacity 0.15s",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 600,
    lineHeight: "24px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    flex: 1,
  },
  status: {
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: "16px",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: "16px",
  },
  errorCard: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.danger,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
    padding: layout.space.xl,
  },
  errorTitle: {
    color: colors.danger,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: 600,
  },
  errorText: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: "18px",
  },
  emptyState: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
    padding: layout.space.xl,
    textAlign: "center" as const,
  },
  emptyTitle: {
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: 600,
  },
  emptyText: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: "18px",
  },
};
