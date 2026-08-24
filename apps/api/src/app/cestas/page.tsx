"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { Screen } from "@/components/Screen";
import { AuthGuard } from "@/components/AuthGuard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { InlineAlert } from "@/components/InlineAlert";
import { api, useBaskets } from "@/context/AuthContext";

export default function CestasPage() {
  const router = useRouter();
  const { data: baskets, isLoading, error, refetch } = useBaskets();

  // Track which basket id has its delete confirmation open
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Track activating state per id
  const [activatingId, setActivatingId] = useState<string | null>(null);

  async function handleActivate(id: string) {
    setActivatingId(id);
    try {
      await api.activateBasket(id);
      refetch();
    } catch {
      // silently fail — refetch will show latest state
    } finally {
      setActivatingId(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteBasket(id);
      setDeletingId(null);
      refetch();
    } catch (err: any) {
      setDeleteError(err.message ?? "Erro ao excluir cesta.");
    } finally {
      setDeleting(false);
    }
  }

  function cancelDelete() {
    setDeletingId(null);
    setDeleteError(null);
  }

  return (
    <AuthGuard>
      <Screen
        pageId="cestas"
        width="standard"
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

        {/* Delete error */}
        {deleteError ? (
          <InlineAlert title="Erro ao excluir" message={deleteError} tone="danger" />
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
            {(baskets ?? []).map((item: any) => {
              const isActive = item.status === "ATIVA";
              const showDeleteConfirm = deletingId === item.id;

              return (
                <div key={item.id ?? item.name} style={styles.cardWrapper}>
                  {/* Delete confirmation inside card */}
                  {showDeleteConfirm ? (
                    <div style={styles.deleteInline}>
                      <span style={styles.deleteText}>
                        Excluir &ldquo;{item.name}&rdquo;?
                      </span>
                      <div style={styles.deleteActions}>
                        <PrimaryButton
                          label={deleting ? "Excluindo..." : "Sim, excluir"}
                          onPress={() => handleDelete(item.id)}
                          tone="danger"
                          disabled={deleting}
                        />
                        <PrimaryButton
                          label="Cancelar"
                          onPress={cancelDelete}
                          tone="neutral"
                          disabled={deleting}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => router.push(`/cestas/${item.id}`)}
                      style={styles.card}
                    >
                      <div style={styles.row}>
                        <span style={styles.name}>{item.name}</span>
                        <span
                          style={{
                            ...styles.status,
                            color: isActive ? colors.success : colors.textMuted,
                          }}
                        >
                          {isActive ? "✅ Ativa" : "Rascunho"}
                        </span>
                      </div>
                      <span style={styles.meta}>{`${item.assetCount} ativos`}</span>
                    </button>
                  )}

                  {/* Action buttons below the card */}
                  {!showDeleteConfirm ? (
                    <div style={styles.cardActions}>
                      {!isActive ? (
                        <PrimaryButton
                          label={
                            activatingId === item.id ? "Ativando..." : "Ativar"
                          }
                          onPress={() => handleActivate(item.id)}
                          tone="primary"
                          disabled={activatingId === item.id}
                        />
                      ) : null}
                      {!isActive ? (
                        <PrimaryButton
                          label="Excluir"
                          onPress={() => setDeletingId(item.id)}
                          tone="danger"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </Screen>
    </AuthGuard>
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
  cardWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.xs,
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
  cardActions: {
    display: "flex",
    gap: layout.space.sm,
    paddingLeft: layout.space.sm,
    paddingRight: layout.space.sm,
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
  deleteInline: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
    padding: layout.space.md,
    backgroundColor: colors.accentPanel,
    borderColor: colors.danger,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
  },
  deleteText: {
    color: colors.danger,
    fontFamily: typography.mono,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: "18px",
  },
  deleteActions: {
    display: "flex",
    gap: layout.space.sm,
  },
};
