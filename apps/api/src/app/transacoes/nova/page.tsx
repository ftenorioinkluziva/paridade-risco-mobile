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

const TICKERS = [
  "ITUB4",
  "PETR4",
  "VALE3",
  "BBDC4",
  "ABEV3",
  "WEGE3",
  "RENT3",
  "LREN3",
  "MGLU3",
  "BBAS3",
  "B3SA3",
  "ELET3",
  "JBSS3",
  "SUZB3",
  "EQTL3",
];

type TipoOrdem = "COMPRA" | "VENDA";

type FormData = {
  ticker: string;
  tipo: TipoOrdem;
  shares: string;
  pricePerShare: string;
  tradedAt: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NovaTransacaoPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormData>({
    ticker: "",
    tipo: "COMPRA",
    shares: "",
    pricePerShare: "",
    tradedAt: todayString(),
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear field-level error on edit
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    // Clear global error on any edit
    if (submitError) setSubmitError(null);
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};

    if (!form.ticker.trim()) errs.ticker = "Selecione um ticker.";
    if (!form.shares.trim()) {
      errs.shares = "Informe a quantidade de cotas.";
    } else if (Number(form.shares) <= 0) {
      errs.shares = "A quantidade deve ser maior que zero.";
    }
    if (!form.pricePerShare.trim()) {
      errs.pricePerShare = "Informe o preço por cota.";
    } else if (Number(form.pricePerShare) <= 0) {
      errs.pricePerShare = "O preço deve ser maior que zero.";
    }
    if (!form.tradedAt.trim()) {
      errs.tradedAt = "Informe a data da transação.";
    }

    return errs;
  }

  async function handleSubmit() {
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const body = {
        ticker: form.ticker.trim().toUpperCase(),
        type: form.tipo,
        shares: Number(form.shares),
        pricePerShare: Number(form.pricePerShare),
        tradedAt: new Date(form.tradedAt + "T12:00:00").toISOString(),
      };

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.message ?? errData?.error ?? `Erro ${res.status} ao criar transação.`
        );
      }

      router.push("/transacoes");
    } catch (err: any) {
      setSubmitError(err.message ?? "Erro inesperado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const formattedPrice =
    form.pricePerShare
      ? `R$ ${Number(form.pricePerShare).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "R$ 0,00";

  const formattedTotal =
    form.shares && form.pricePerShare
      ? `R$ ${(Number(form.shares) * Number(form.pricePerShare)).toLocaleString(
          "pt-BR",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}`
      : "R$ 0,00";

  return (
    <AuthGuard>
      <Screen
      title="Nova transação"
      subtitle="Registre uma movimentação de compra ou venda na carteira."
    >
      {/* Global error */}
      {submitError ? (
        <InlineAlert
          title="Erro ao enviar"
          message={submitError}
          tone="danger"
        />
      ) : null}

      <div style={styles.form}>
        {/* Ticker */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Ativo (ticker)</label>
          <select
            style={styles.select}
            value={form.ticker}
            onChange={(e) => update("ticker", e.target.value)}
          >
            <option value="">Selecione um ativo</option>
            {TICKERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {errors.ticker ? (
            <span style={styles.fieldError}>{errors.ticker}</span>
          ) : null}
        </div>

        {/* Tipo: COMPRA / VENDA */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Tipo de operação</label>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="tipo"
                value="COMPRA"
                checked={form.tipo === "COMPRA"}
                onChange={() => update("tipo", "COMPRA")}
                style={styles.radio}
              />
              <span
                style={{
                  ...styles.radioText,
                  color: form.tipo === "COMPRA" ? colors.success : colors.textMuted,
                }}
              >
                COMPRA
              </span>
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="tipo"
                value="VENDA"
                checked={form.tipo === "VENDA"}
                onChange={() => update("tipo", "VENDA")}
                style={styles.radio}
              />
              <span
                style={{
                  ...styles.radioText,
                  color: form.tipo === "VENDA" ? colors.danger : colors.textMuted,
                }}
              >
                VENDA
              </span>
            </label>
          </div>
        </div>

        {/* Shares */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Quantidade de cotas</label>
          <InputField
            type="number"
            value={form.shares}
            onChange={(v) => update("shares", v)}
            placeholder="Ex.: 100"
          />
          {errors.shares ? (
            <span style={styles.fieldError}>{errors.shares}</span>
          ) : null}
        </div>

        {/* Price per share */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Preço por cota (BRL)</label>
          <InputField
            type="number"
            value={form.pricePerShare}
            onChange={(v) => update("pricePerShare", v)}
            placeholder="Ex.: 35,50"
          />
          {errors.pricePerShare ? (
            <span style={styles.fieldError}>{errors.pricePerShare}</span>
          ) : null}
        </div>

        {/* Traded at */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Data da transação</label>
          <InputField
            type="date"
            value={form.tradedAt}
            onChange={(v) => update("tradedAt", v)}
          />
          {errors.tradedAt ? (
            <span style={styles.fieldError}>{errors.tradedAt}</span>
          ) : null}
        </div>

        {/* Preview */}
        <div style={styles.previewCard}>
          <div style={styles.previewRow}>
            <span style={styles.previewLabel}>Preço unitário</span>
            <span style={styles.previewValue}>{formattedPrice}</span>
          </div>
          <div style={styles.previewRow}>
            <span style={styles.previewLabel}>Valor total estimado</span>
            <span
              style={{
                ...styles.previewValue,
                color: form.tipo === "COMPRA" ? colors.success : colors.danger,
                fontWeight: 700,
              }}
            >
              {formattedTotal}
            </span>
          </div>
        </div>

        {/* Submit */}
        <PrimaryButton
          label={submitting ? "Enviando..." : "Registrar transação"}
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
    gap: layout.space.xs,
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
  radioGroup: {
    display: "flex",
    gap: layout.space.md,
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
    padding: `${layout.space.xs}px ${layout.space.md}px`,
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.sm,
    borderWidth: 1,
    borderStyle: "solid",
  },
  radio: {
    accentColor: colors.primary,
    cursor: "pointer",
  },
  radioText: {
    fontFamily: typography.mono,
    fontSize: 12,
    fontWeight: 600,
  },
  fieldError: {
    color: colors.danger,
    fontFamily: typography.mono,
    fontSize: 11,
    lineHeight: "16px",
  },
  previewCard: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.sm,
    padding: layout.space.md,
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
  },
  previewRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  previewLabel: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: "16px",
  },
  previewValue: {
    fontFamily: typography.mono,
    fontSize: 14,
    lineHeight: "20px",
    color: colors.text,
  },
};