"use client";

import { useRouter, useParams } from "next/navigation";
import { useState } from "react";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { Screen } from "@/components/Screen";
import { AuthGuard } from "@/components/AuthGuard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TypeBadge } from "@/components/TypeBadge";
import { InputField } from "@/components/InputField";
import { InlineAlert } from "@/components/InlineAlert";
import { useBasketDetail, useAssets, useFunds, api } from "@/context/AuthContext";

type EditAllocation = {
  assetTicker: string;
  targetPercentage: string;
};

export default function BasketDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: basket, isLoading, error, refetch } = useBasketDetail(id);
  const { data: assets } = useAssets();
  const { data: funds } = useFunds();

  const optionMap = new Map<string, { ticker: string; name: string; label: string }>();
  for (const a of assets ?? []) {
    const t = a.ticker;
    if (!optionMap.has(t)) {
      optionMap.set(t, { ticker: t, name: a.name, label: `${a.name} (${t})` });
    }
  }
  for (const f of funds ?? []) {
    const t = f.indexAssetTicker;
    if (t && !optionMap.has(t)) {
      optionMap.set(t, { ticker: t, name: f.name, label: `${f.name} (${t})` });
    }
  }
  const allocOptions = [...optionMap.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAllocations, setEditAllocations] = useState<EditAllocation[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);

  // --- Edit helpers ---

  function enterEditMode() {
    if (!basket) return;
    setEditName(basket.name ?? "");
    setEditAllocations(
      (basket.allocations ?? []).map((a: any) => ({
        assetTicker: a.ticker ?? "",
        targetPercentage: String(a.targetPercentage ?? ""),
      }))
    );
    setEditError(null);
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setEditError(null);
  }

  function updateEditAlloc(index: number, key: keyof EditAllocation, value: string) {
    setEditAllocations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
    if (editError) setEditError(null);
  }

  function removeEditAlloc(index: number) {
    setEditAllocations((prev) => prev.filter((_, i) => i !== index));
  }

  function addEditAlloc() {
    setEditAllocations((prev) => [...prev, { assetTicker: "", targetPercentage: "" }]);
  }

  const totalPercentage = editAllocations.reduce(
    (sum, row) => sum + (Number(row.targetPercentage) || 0),
    0
  );
  const percentageWarning =
    editAllocations.length > 0 && totalPercentage !== 100
      ? `A soma das alocações é ${totalPercentage}% — o ideal é 100%.`
      : null;

  async function handleSave() {
    if (!editName.trim()) {
      setEditError("Informe o nome da cesta.");
      return;
    }
    const hasEmptyTicker = editAllocations.some((row) => !row.assetTicker.trim());
    const hasInvalidPct = editAllocations.some(
      (row) =>
        row.targetPercentage.trim() === "" ||
        Number(row.targetPercentage) < 0 ||
        Number(row.targetPercentage) > 100
    );
    if (hasEmptyTicker) {
      setEditError("Selecione um ativo para cada alocação.");
      return;
    }
    if (hasInvalidPct) {
      setEditError("Cada percentual deve estar entre 0 e 100.");
      return;
    }
    if (totalPercentage !== 100) {
      setEditError("A soma dos percentuais deve ser exatamente 100%.");
      return;
    }

    setEditing(true);
    setEditError(null);

    try {
      await api.updateBasket(id, {
        name: editName.trim(),
        allocations: editAllocations.map((a) => ({
          assetTicker: a.assetTicker,
          targetPercentage: Number(a.targetPercentage),
        })),
      });
      setEditMode(false);
      refetch();
    } catch (err: any) {
      setEditError(err.message ?? "Erro ao salvar. Tente novamente.");
    } finally {
      setEditing(false);
    }
  }

  // --- Delete ---

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteBasket(id);
      router.push("/cestas");
    } catch (err: any) {
      setDeleteError(err.message ?? "Erro ao excluir. Tente novamente.");
      setDeleting(false);
    }
  }

  // --- Activate ---

  async function handleActivate() {
    setActivating(true);
    setActivateError(null);
    try {
      await api.activateBasket(id);
      refetch();
    } catch (err: any) {
      setActivateError(err.message ?? "Erro ao ativar. Tente novamente.");
    } finally {
      setActivating(false);
    }
  }

  async function handleDeactivate() {
    setActivating(true);
    setActivateError(null);
    try {
      await api.activateBasket(id, "deactivate");
      refetch();
    } catch (err: any) {
      setActivateError(err.message ?? "Erro ao desativar. Tente novamente.");
    } finally {
      setActivating(false);
    }
  }

  const isActive = basket?.status === "ATIVA";

  return (
    <AuthGuard>
      <Screen
        title={basket?.name ?? "Detalhe da Cesta"}
        subtitle="Alocação alvo e composição da cesta."
        action={
          <div style={styles.headerActions}>
            <PrimaryButton label="Voltar" onPress={() => router.back()} tone="neutral" />
            {!isLoading && !error && basket ? (
              <>
                {!isActive ? (
                  <PrimaryButton
                    label={activating ? "Ativando..." : "Ativar"}
                    onPress={handleActivate}
                    tone="primary"
                    disabled={activating}
                  />
                ) : (
                  <PrimaryButton
                    label="Desativar"
                    onPress={handleDeactivate}
                    tone="neutral"
                  />
                )}
                <PrimaryButton
                  label={editMode ? "Editando..." : "Editar"}
                  onPress={enterEditMode}
                  tone="neutral"
                  disabled={editMode || activating}
                />
                <PrimaryButton
                  label="Excluir"
                  onPress={() => setShowDeleteConfirm(true)}
                  tone="danger"
                  disabled={editMode || deleting}
                />
              </>
            ) : null}
          </div>
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
            {/* Activate error */}
            {activateError ? (
              <InlineAlert title="Erro ao ativar" message={activateError} tone="danger" />
            ) : null}

            {/* Delete confirmation */}
            {showDeleteConfirm ? (
              <div style={styles.deleteConfirmBox}>
                <span style={styles.deleteConfirmTitle}>
                  Tem certeza que deseja excluir esta cesta?
                </span>
                <span style={styles.deleteConfirmText}>
                  Esta ação não pode ser desfeita.
                </span>
                {deleteError ? (
                  <span style={styles.deleteError}>{deleteError}</span>
                ) : null}
                <div style={styles.deleteActions}>
                  <PrimaryButton
                    label={deleting ? "Excluindo..." : "Confirmar exclusão"}
                    onPress={handleDelete}
                    tone="danger"
                    disabled={deleting}
                  />
                  <PrimaryButton
                    label="Cancelar"
                    onPress={() => {
                      setShowDeleteConfirm(false);
                      setDeleteError(null);
                    }}
                    tone="neutral"
                    disabled={deleting}
                  />
                </div>
              </div>
            ) : null}

            {/* Edit mode */}
            {editMode ? (
              <div style={styles.editSection}>
                {/* Edit error */}
                {editError ? (
                  <InlineAlert title="Erro" message={editError} tone="danger" />
                ) : null}

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Nome da cesta</label>
                  <InputField value={editName} onChange={setEditName} />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Alocações</label>
                  <div style={styles.allocationsList}>
                    {editAllocations.map((row, idx) => (
                      <div key={idx} style={styles.allocationRow}>
                        <div style={styles.allocationSelectWrap}>
                          <select
                            style={styles.select}
                            value={row.assetTicker}
                            onChange={(e) =>
                              updateEditAlloc(idx, "assetTicker", e.target.value)
                            }
                          >
                            <option value="">Selecionar ativo</option>
                            {allocOptions.map((opt: any) => (
                              <option
                                key={opt.ticker}
                                value={opt.ticker}
                              >
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={styles.pctInputWrap}>
                          <InputField
                            type="number"
                            value={row.targetPercentage}
                            onChange={(v) =>
                              updateEditAlloc(idx, "targetPercentage", v)
                            }
                            placeholder="%"
                          />
                        </div>
                        <button
                          style={styles.removeBtn}
                          onClick={() => removeEditAlloc(idx)}
                          disabled={editAllocations.length <= 1}
                          title="Remover ativo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <PrimaryButton
                    label="Adicionar ativo"
                    onPress={addEditAlloc}
                    tone="neutral"
                  />

                  {percentageWarning ? (
                    <span style={styles.warning}>{percentageWarning}</span>
                  ) : null}

                  <div style={styles.editActions}>
                    <PrimaryButton
                      label={editing ? "Salvando..." : "Salvar"}
                      onPress={handleSave}
                      disabled={editing}
                    />
                    <PrimaryButton
                      label="Cancelar"
                      onPress={cancelEdit}
                      tone="neutral"
                      disabled={editing}
                    />
                  </div>
                </div>
              </div>
            ) : (
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
                      color: isActive ? colors.success : colors.textMuted,
                      borderColor: isActive ? colors.success : colors.border,
                    }}
                  >
                    {isActive ? "✅ Ativa" : "Rascunho"}
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
                              {alloc.name ?? alloc.fundName ?? alloc.fundId ?? "Fundo"}
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
            )}
          </>
        ) : null}
      </Screen>
    </AuthGuard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headerActions: {
    display: "flex",
    gap: layout.space.sm,
    flexWrap: "wrap" as const,
    justifyContent: "flex-end",
  },
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
    textTransform: "uppercase" as const,
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
    whiteSpace: "nowrap" as const,
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
  // Edit mode styles
  editSection: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.lg,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
  },
  label: {
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
  },
  select: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: "solid",
    color: colors.text,
    minHeight: 48,
    padding: "0 14px",
    fontFamily: typography.mono,
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box" as const,
    outline: "none",
    cursor: "pointer",
    appearance: "auto" as const,
  },
  allocationSelectWrap: {
    flex: 1,
    minWidth: 0,
  },
  pctInputWrap: {
    width: 80,
    flexShrink: 0,
  },
  removeBtn: {
    all: "unset" as const,
    cursor: "pointer",
    color: colors.danger,
    fontFamily: typography.mono,
    fontSize: 16,
    fontWeight: 700,
    lineHeight: "24px",
    width: 32,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    opacity: 0.7,
  },
  warning: {
    color: colors.warning,
    fontFamily: typography.mono,
    fontSize: 11,
    lineHeight: "16px",
  },
  editActions: {
    display: "flex",
    gap: layout.space.sm,
  },
  // Delete confirmation
  deleteConfirmBox: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
    padding: layout.space.lg,
    backgroundColor: colors.accentPanel,
    borderColor: colors.danger,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
  },
  deleteConfirmTitle: {
    color: colors.danger,
    fontFamily: typography.mono,
    fontSize: 14,
    fontWeight: 600,
  },
  deleteConfirmText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: "16px",
  },
  deleteError: {
    color: colors.danger,
    fontFamily: typography.mono,
    fontSize: 11,
    lineHeight: "16px",
  },
  deleteActions: {
    display: "flex",
    gap: layout.space.sm,
  },
};
