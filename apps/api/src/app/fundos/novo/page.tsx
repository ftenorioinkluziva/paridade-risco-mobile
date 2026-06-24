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
import { api, useAssets } from "@/context/AuthContext";

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NovoFundoPage() {
  const router = useRouter();
  const { data: assets } = useAssets();

  const [name, setName] = useState("");
  const [initialInvestment, setInitialInvestment] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [investmentDate, setInvestmentDate] = useState(todayString());
  const [indexAssetId, setIndexAssetId] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) { setSubmitError("Informe o nome do fundo."); return; }
    if (!initialInvestment.trim() || Number(initialInvestment) <= 0) { setSubmitError("Informe o valor investido."); return; }
    if (!currentValue.trim() || Number(currentValue) <= 0) { setSubmitError("Informe o valor atual."); return; }
    if (!investmentDate.trim()) { setSubmitError("Informe a data do investimento."); return; }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await api.createFund({
        name: name.trim(),
        initialInvestment: Number(initialInvestment),
        currentValue: Number(currentValue),
        investmentDate: new Date(investmentDate + "T12:00:00").toISOString(),
        indexAssetId: indexAssetId || null,
      });
      router.push("/fundos");
    } catch (err: any) {
      setSubmitError(err.message ?? "Erro inesperado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGuard>
      <Screen
        title="Novo fundo"
        subtitle="Registre um fundo de investimento na carteira."
        action={
          <PrimaryButton label="Voltar" onPress={() => router.back()} tone="neutral" />
        }
      >
        {submitError ? (
          <InlineAlert title="Erro" message={submitError} tone="danger" />
        ) : null}

        <div style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Nome do fundo</label>
            <InputField value={name} onChange={setName} placeholder="Ex.: Fundo Multimercado" />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Valor investido (R$)</label>
            <InputField type="number" value={initialInvestment} onChange={setInitialInvestment} placeholder="Ex.: 50000" />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Valor atual (R$)</label>
            <InputField type="number" value={currentValue} onChange={setCurrentValue} placeholder="Ex.: 52340" />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Data do investimento</label>
            <InputField type="date" value={investmentDate} onChange={setInvestmentDate} />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Ativo de referência (opcional)</label>
            <select
              style={styles.select}
              value={indexAssetId}
              onChange={(e) => setIndexAssetId(e.target.value)}
            >
              <option value="">Nenhum</option>
              {(assets ?? []).map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.ticker})
                </option>
              ))}
            </select>
          </div>

          <PrimaryButton
            label={submitting ? "Criando..." : "Criar fundo"}
            onPress={handleSubmit}
            disabled={submitting}
          />
        </div>
      </Screen>
    </AuthGuard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: layout.space.lg },
  fieldGroup: { display: "flex", flexDirection: "column", gap: layout.space.xs },
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
};
