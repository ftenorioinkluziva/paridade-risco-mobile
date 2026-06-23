"use client";

import { useRouter, useParams } from "next/navigation";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { Screen } from "@/components/Screen";
import { AuthGuard } from "@/components/AuthGuard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TypeBadge } from "@/components/TypeBadge";
import { useBasketDetail } from "@/context/AuthContext";

export default function BasketDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: basket, isLoading, error } = useBasketDetail(id);

  return (
    <AuthGuard>
      <Screen
      title={basket?.name ?? "Detalhe da Cesta"}
      subtitle="Alocação alvo e composição da cesta."
      action={
        <PrimaryButton label="Voltar" onPress={() => router.back()} tone="neutral" />
      }
    >
      {/* Error state */}
      {error ? (
        <div style={styles.errorCard}>
          <span style={styles.errorTitle}>Erro ao carregar cesta</span>
          <span style={styles.errorText}>{error}</span>
        </div>
      ) : null}

      {/* Loading state */}
      {isLoading && !error ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyTitle}>Carregando cesta...</span>
        </div>
      ) : null}

      {/* Detail content */}
      {!isLoading && !error && basket ? (
        <>
          {/* Descrição */}
          {basket.description ? (
            <div style={styles.section}>
              <div style={styles.sectionLabel}>// DESCRIÇÃO</div>
              <p style={styles.description}>{basket.description}</p>
            </div>
          ) : null}

          {/* Status */}
          <div style={styles.statusRow}>
            <span style={styles.sectionLabelInline}>Status</span>
            <span
              style={{
                ...styles.statusBadge,
                color:
                  basket.status === "ATIVA"
                    ? colors.primary
                    : basket.status === "RASCUNHO"
                      ? colors.warning
                      : colors.textMuted,
                borderColor:
                  basket.status === "ATIVA"
                    ? colors.primary
                    : basket.status === "RASCUNHO"
                      ? colors.warning
                      : colors.border,
              }}
            >
              {basket.status === "ATIVA"
                ? "Ativa"
                : basket.status === "RASCUNHO"
                  ? "Rascunho"
                  : basket.status}
            </span>
          </div>

          {/* Alocações */}
          <div style={styles.section}>
            <div style={styles.sectionLabel}>// ALOCAÇÕES</div>
            {(basket.allocations?.length ?? 0) === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyText}>
                  Nenhuma alocação definida para esta cesta.
                </span>
              </div>
            ) : (
              <div style={styles.allocationsList}>
                {(basket.allocations ?? []).map((alloc: any, idx: number) => (
                  <div key={alloc.fundId ?? idx} style={styles.allocationCard}>
                    <div style={styles.allocationRow}>
                      <span style={styles.fundName}>
                        {alloc.fundName ?? alloc.fundId ?? "Fundo"}
                      </span>
                      <TypeBadge
                        label={`${alloc.targetPercentage ?? 0}%`}
                        variant="buy"
                      />
                    </div>
                    <div style={styles.allocationMeta}>
                      {alloc.currentPercentage != null ? (
                        <span style={styles.currentPct}>
                          Atual: {alloc.currentPercentage}%
                        </span>
                      ) : null}
                    </div>
                    {/* Barra de progresso visual */}
                    <div style={styles.progressTrack}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${Math.min(alloc.targetPercentage ?? 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </Screen>
    </AuthGuard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionLabelInline: {
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: "16px",
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: "22px",
    margin: 0,
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    padding: layout.space.md,
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: layout.space.sm,
  },
  statusBadge: {
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 700,
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 4,
    padding: "2px 8px",
    lineHeight: "18px",
  },
  allocationsList: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
  },
  allocationCard: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.xs,
    padding: layout.space.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
  },
  allocationRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: layout.space.sm,
  },
  fundName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: "20px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  allocationMeta: {
    display: "flex",
    gap: layout.space.sm,
  },
  currentPct: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    lineHeight: "16px",
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
    transition: "width 0.3s ease",
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
    textAlign: "center",
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