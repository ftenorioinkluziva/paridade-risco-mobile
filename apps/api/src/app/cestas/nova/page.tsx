"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { Screen } from "@/components/Screen";
import { AuthGuard } from "@/components/AuthGuard";
import { InputField } from "@/components/InputField";
import { PrimaryButton } from "@/components/PrimaryButton";
import { InlineAlert } from "@/components/InlineAlert";
import { api, useAssets, useFunds } from "@/context/AuthContext";

type AllocationRow = {
  assetTicker: string;
  targetPercentage: string;
};

export default function NovaCestaPage() {
  const router = useRouter();

const { data: funds, isLoading: fundsLoading } = useFunds();
  const { data: assets, isLoading: assetsLoading } = useAssets();

  const optionMap = new Map<string, { ticker: string; label: string }>();
  for (const a of assets ?? []) {
    const t = a.ticker;
    if (!optionMap.has(t)) {
      optionMap.set(t, { ticker: t, label: `${a.name} (${t})` });
    }
  }
  for (const f of funds ?? []) {
    const t = f.indexAssetTicker;
    if (t && !optionMap.has(t)) {
      optionMap.set(t, { ticker: t, label: `${f.name} (${t})` });
    }
  }
  const allocOptions = [...optionMap.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));

  const [name, setName] = useState("");
  const [allocations, setAllocations] = useState<AllocationRow[]>([
    { assetTicker: "", targetPercentage: "" },
  ]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateAllocation(index: number, key: keyof AllocationRow, value: string) {
    setAllocations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
    if (submitError) setSubmitError(null);
  }

  function removeAllocation(index: number) {
    setAllocations((prev) => prev.filter((_, i) => i !== index));
  }

  function addAllocation() {
    setAllocations((prev) => [...prev, { assetTicker: "", targetPercentage: "" }]);
  }

  const totalPercentage = allocations.reduce(
    (sum, row) => sum + (Number(row.targetPercentage) || 0),
    0
  );
  const percentageWarning =
    allocations.length > 0 && totalPercentage !== 100
      ? `A soma das alocações é ${totalPercentage}% — o ideal é 100%.`
      : null;

  const hasEmptyTicker = allocations.some((row) => !row.assetTicker.trim());
  const hasInvalidPct = allocations.some(
    (row) => row.targetPercentage.trim() === "" || Number(row.targetPercentage) < 0 || Number(row.targetPercentage) > 100
  );

  async function handleSubmit() {
    if (!name.trim()) {
      setSubmitError("Informe o nome da cesta.");
      return;
    }
    if (hasEmptyTicker) {
      setSubmitError("Selecione um ativo para cada alocação.");
      return;
    }
    if (hasInvalidPct) {
      setSubmitError("Cada percentual deve estar entre 0 e 100.");
      return;
    }
    if (totalPercentage !== 100) {
      setSubmitError("A soma dos percentuais deve ser exatamente 100%.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await api.createBasket({
        name: name.trim(),
        allocations: allocations.map((a) => ({
          assetTicker: a.assetTicker,
          targetPercentage: Number(a.targetPercentage),
        })),
      });
      router.push("/cestas");
    } catch (err: any) {
      setSubmitError(err.message ?? "Erro inesperado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGuard>
      <Screen
        title="Nova cesta"
        subtitle="Defina os ativos e pesos da cesta."
        action={
          <PrimaryButton label="Voltar" onPress={() => router.back()} tone="neutral" />
        }
      >
        {/* Global error */}
        {submitError ? (
          <InlineAlert title="Erro" message={submitError} tone="danger" />
        ) : null}

        <div style={styles.form}>
          {/* Nome */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Nome da cesta</label>
            <InputField
              value={name}
              onChange={setName}
              placeholder="Ex.: Cesta Conservadora"
            />
          </div>

          {/* Alocações */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Alocações</label>
            <div style={styles.allocationsList}>
              {allocations.map((row, idx) => (
                <div key={idx} style={styles.allocationRow}>
                  <div style={styles.allocationSelectWrap}>
                    <select
                      style={styles.select}
                      value={row.assetTicker}
                      onChange={(e) =>
                        updateAllocation(idx, "assetTicker", e.target.value)
                      }
                      disabled={assetsLoading}
                    >
                      <option value="">
                        {assetsLoading ? "Carregando..." : "Selecionar ativo"}
                      </option>
{allocOptions.map((opt) => (
                        <option key={opt.ticker} value={opt.ticker}>
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
                        updateAllocation(idx, "targetPercentage", v)
                      }
                      placeholder="%"
                    />
                  </div>
                  <button
                    style={styles.removeBtn}
                    onClick={() => removeAllocation(idx)}
                    disabled={allocations.length <= 1}
                    title="Remover ativo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <PrimaryButton
              label="Adicionar ativo"
              onPress={addAllocation}
              tone="neutral"
            />

            {percentageWarning ? (
              <span style={styles.warning}>{percentageWarning}</span>
            ) : null}
          </div>

          <PrimaryButton
            label={submitting ? "Criando..." : "Criar cesta"}
            onPress={handleSubmit}
            disabled={submitting}
          />
        </div>
      </Screen>
    </AuthGuard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
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
  allocationsList: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
  },
  allocationRow: {
    display: "flex",
    gap: layout.space.sm,
    alignItems: "center",
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
};
