"use client";

import { useRouter, useParams } from "next/navigation";
import { useState } from "react";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { Screen } from "@/components/Screen";
import { AuthGuard } from "@/components/AuthGuard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { InputField } from "@/components/InputField";
import { InlineAlert } from "@/components/InlineAlert";
import { useFundDetail, useAssets, api } from "@/context/AuthContext";
import { formatCurrency, formatSignedCurrency, formatPercentage, formatDate } from "@/lib/formatters";

export default function FundDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: fund, isLoading, error, refetch } = useFundDetail(id);
  const { data: assets } = useAssets();

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editInitial, setEditInitial] = useState("");
  const [editCurrent, setEditCurrent] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editIndexAssetId, setEditIndexAssetId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function enterEditMode() {
    if (!fund) return;
    setEditName(fund.name ?? "");
    setEditInitial(String(fund.initialInvestment ?? ""));
    setEditCurrent(String(fund.currentValue ?? ""));
    setEditDate((fund.investmentDate ?? "").slice(0, 10));
    setEditIndexAssetId(fund.indexAssetId ?? null);
    setEditError(null);
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setEditError(null);
  }

  async function handleSave() {
    if (!editName.trim()) { setEditError("Informe o nome do fundo."); return; }

    setEditing(true);
    setEditError(null);

    try {
      await api.updateFund(id, {
        name: editName.trim(),
        initialInvestment: Number(editInitial),
        currentValue: Number(editCurrent),
        investmentDate: new Date(editDate + "T12:00:00").toISOString(),
        indexAssetId: editIndexAssetId || null,
      });
      setEditMode(false);
      refetch();
    } catch (err: any) {
      setEditError(err.message ?? "Erro ao salvar. Tente novamente.");
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteFund(id);
      router.push("/fundos");
    } catch (err: any) {
      setDeleteError(err.message ?? "Erro ao excluir. Tente novamente.");
      setDeleting(false);
    }
  }

  const gain = fund ? fund.currentValue - fund.initialInvestment : 0;
  const gainPct = fund && fund.initialInvestment > 0 ? (gain / fund.initialInvestment) * 100 : 0;
  const isPositive = gain >= 0;

  return (
    <AuthGuard>
      <Screen
        title={fund?.name ?? "Detalhe do Fundo"}
        subtitle="Informações do fundo de investimento."
        action={
          <div style={styles.headerActions}>
            <PrimaryButton label="Voltar" onPress={() => router.back()} tone="neutral" />
            {!isLoading && !error && fund ? (
              <>
                <PrimaryButton
                  label={editMode ? "Editando..." : "Editar"}
                  onPress={enterEditMode}
                  tone="neutral"
                  disabled={editMode || deleting}
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
        {error ? (
          <div style={styles.errorCard}>
            <span style={styles.errorTitle}>Erro ao carregar fundo</span>
            <span style={styles.errorText}>{error}</span>
          </div>
        ) : null}

        {isLoading && !error ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyTitle}>Carregando fundo...</span>
          </div>
        ) : null}

        {!isLoading && !error && fund ? (
          <>
            {deleteError ? (
              <InlineAlert title="Erro ao excluir" message={deleteError} tone="danger" />
            ) : null}

            {showDeleteConfirm ? (
              <div style={styles.deleteConfirmBox}>
                <span style={styles.deleteConfirmTitle}>
                  Tem certeza que deseja excluir &ldquo;{fund.name}&rdquo;?
                </span>
                <span style={styles.deleteConfirmText}>Esta ação não pode ser desfeita.</span>
                <div style={styles.deleteActions}>
                  <PrimaryButton
                    label={deleting ? "Excluindo..." : "Confirmar exclusão"}
                    onPress={handleDelete}
                    tone="danger"
                    disabled={deleting}
                  />
                  <PrimaryButton
                    label="Cancelar"
                    onPress={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                    tone="neutral"
                    disabled={deleting}
                  />
                </div>
              </div>
            ) : null}

            {editMode ? (
              <div style={styles.editSection}>
                {editError ? (
                  <InlineAlert title="Erro" message={editError} tone="danger" />
                ) : null}

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Nome do fundo</label>
                  <InputField value={editName} onChange={setEditName} />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Valor investido (R$)</label>
                  <InputField type="number" value={editInitial} onChange={setEditInitial} />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Valor atual (R$)</label>
                  <InputField type="number" value={editCurrent} onChange={setEditCurrent} />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Data do investimento</label>
                  <InputField type="date" value={editDate} onChange={setEditDate} />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Ativo de referência</label>
                  <select
                    style={styles.select}
                    value={editIndexAssetId ?? ""}
                    onChange={(e) => setEditIndexAssetId(e.target.value || null)}
                  >
                    <option value="">Nenhum</option>
                    {(assets ?? []).map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.ticker})
                      </option>
                    ))}
                  </select>
                </div>

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
            ) : (
              <>
                <div style={styles.detailGrid}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Valor investido</span>
                    <span style={styles.detailValue}>{formatCurrency(fund.initialInvestment)}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Valor atual</span>
                    <span style={styles.detailValue}>{formatCurrency(fund.currentValue)}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Ganho / Perda</span>
                    <span style={{ ...styles.detailValue, color: isPositive ? colors.success : colors.danger }}>
                      {formatSignedCurrency(gain)} ({formatPercentage(gainPct)})
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Data do investimento</span>
                    <span style={styles.detailValue}>{formatDate(fund.investmentDate)}</span>
                  </div>
                  {fund.indexAsset ? (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Ativo de referência</span>
                      <span style={styles.detailValue}>
                        {fund.indexAsset.name} ({fund.indexAsset.ticker})
                      </span>
                    </div>
                  ) : null}
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
    display: "flex", gap: layout.space.sm, flexWrap: "wrap" as const, justifyContent: "flex-end",
  },
  detailGrid: {
    display: "flex", flexDirection: "column", gap: layout.space.lg,
  },
  detailItem: {
    display: "flex", flexDirection: "column", gap: layout.space.xs,
  },
  detailLabel: {
    color: colors.textSoft, fontFamily: typography.mono, fontSize: 11, fontWeight: 700,
    letterSpacing: 0.6, textTransform: "uppercase" as const,
  },
  detailValue: {
    color: colors.text, fontFamily: typography.mono, fontSize: 16, fontWeight: 600,
  },
  editSection: {
    display: "flex", flexDirection: "column", gap: layout.space.lg,
  },
  fieldGroup: {
    display: "flex", flexDirection: "column", gap: layout.space.sm,
  },
  label: {
    color: colors.textMuted, fontFamily: typography.mono, fontSize: 11, fontWeight: 700,
    letterSpacing: 0.6, textTransform: "uppercase" as const,
  },
  select: {
    backgroundColor: colors.accentPanel, borderColor: colors.border, borderRadius: 4,
    borderWidth: 1, borderStyle: "solid", color: colors.text, minHeight: 48,
    padding: "0 14px", fontFamily: typography.mono, fontSize: 14, width: "100%",
    boxSizing: "border-box" as const, outline: "none", cursor: "pointer", appearance: "auto" as const,
  },
  editActions: {
    display: "flex", gap: layout.space.sm,
  },
  errorCard: {
    backgroundColor: colors.accentPanel, borderColor: colors.danger, borderRadius: layout.radius.md,
    borderWidth: 1, borderStyle: "solid", display: "flex", flexDirection: "column",
    gap: layout.space.sm, padding: layout.space.xl,
  },
  errorTitle: { color: colors.danger, fontFamily: typography.mono, fontSize: 14, fontWeight: 600 },
  errorText: { color: colors.textSoft, fontSize: 12, lineHeight: "18px" },
  emptyState: {
    backgroundColor: colors.accentPanel, borderColor: colors.border, borderRadius: layout.radius.md,
    borderWidth: 1, borderStyle: "solid", display: "flex", flexDirection: "column",
    gap: layout.space.sm, padding: layout.space.xl, textAlign: "center" as const,
  },
  emptyTitle: { color: colors.textMuted, fontFamily: typography.mono, fontSize: 14, fontWeight: 600 },
  deleteConfirmBox: {
    display: "flex", flexDirection: "column", gap: layout.space.sm, padding: layout.space.lg,
    backgroundColor: colors.accentPanel, borderColor: colors.danger, borderRadius: layout.radius.md,
    borderWidth: 1, borderStyle: "solid",
  },
  deleteConfirmTitle: { color: colors.danger, fontFamily: typography.mono, fontSize: 14, fontWeight: 600 },
  deleteConfirmText: { color: colors.textMuted, fontSize: 12, lineHeight: "16px" },
  deleteActions: { display: "flex", gap: layout.space.sm },
};
