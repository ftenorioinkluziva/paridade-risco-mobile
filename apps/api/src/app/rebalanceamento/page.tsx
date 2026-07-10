"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { colors } from "@/theme/colors";
import { layout } from "@/theme/layout";
import { typography } from "@/theme/typography";
import { Screen } from "@/components/Screen";
import { AuthGuard } from "@/components/AuthGuard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SummaryCard } from "@/components/SummaryCard";
import { RebalanceDecisionCard } from "@/components/RebalanceDecisionCard";
import { InlineAlert } from "@/components/InlineAlert";
import { api, usePortfolioSummary, useRebalancePreview } from "@/context/AuthContext";
import { formatCurrency, formatSignedCurrency } from "@/lib/formatters";

function parseCurrencyInput(value: string) {
  const normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function RebalanceamentoPage() {
  const router = useRouter();
  const portfolio = usePortfolioSummary();
  const rebalance = useRebalancePreview();
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState("");
  const [cashError, setCashError] = useState<string | null>(null);
  const [isSavingCash, setIsSavingCash] = useState(false);

  const portfolioError = portfolio.error;
  const rebalanceError = rebalance.error;
  const summary = portfolio.data;
  const rebalData = rebalance.data;

  // Derived values
  const investedValue = rebalData?.calculationBaseValue ?? rebalData?.portfolioValue ?? 0;
  const cashAvailable = rebalData?.cashAvailable ?? summary?.cash ?? 0;
  const rebalanceCost = rebalData?.rebalanceCost ?? 0;
  const rawCashAfterRebalance = rebalData?.postRebalanceCash ?? (cashAvailable - rebalanceCost);
  const cashAfterRebalance = Math.max(0, rawCashAfterRebalance);
  const cashWasClipped = rawCashAfterRebalance < 0;
  const parsedCashInput = useMemo(() => parseCurrencyInput(cashInput), [cashInput]);
  const cashInputIsInvalid = isEditingCash && (parsedCashInput == null || parsedCashInput < 0);

  useEffect(() => {
    if (!isEditingCash) {
      setCashInput(cashAvailable.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setCashError(null);
    }
  }, [cashAvailable, isEditingCash]);

  async function saveCashBalance() {
    const nextCashBalance = parseCurrencyInput(cashInput);

    if (nextCashBalance == null || nextCashBalance < 0) {
      setCashError("Informe um valor de caixa valido e maior ou igual a zero.");
      return;
    }

    setIsSavingCash(true);
    setCashError(null);

    try {
      await api.updateCashBalance(nextCashBalance);
      await Promise.all([portfolio.refetch(), rebalance.refetch()]);
      setIsEditingCash(false);
    } catch (error) {
      setCashError(error instanceof Error ? error.message : "Nao foi possivel atualizar o caixa.");
    } finally {
      setIsSavingCash(false);
    }
  }

  return (
    <AuthGuard>
      <Screen
      title="Rebalanceamento"
      subtitle="Veja o plano detalhado, confira os custos e decida como agir na corretora."
      action={
        <PrimaryButton
          label="Voltar"
          onPress={() => router.back()}
          tone="neutral"
        />
      }
    >
      {/* Error alerts */}
      {portfolioError ? (
        <InlineAlert
          title="Erro no portfólio"
          message={portfolioError}
          tone="danger"
        />
      ) : null}
      {rebalanceError ? (
        <InlineAlert
          title="Erro no rebalanceamento"
          message={rebalanceError}
          tone="danger"
        />
      ) : null}

      {/* Full RebalanceDecisionCard with actions */}
      <RebalanceDecisionCard
        data={rebalData}
        isLoading={rebalance.isLoading}
        error={rebalanceError}
        showActions
        showMetrics
      />

      {/* Summary section */}
      {rebalData || summary ? (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>// RESUMO_FINANCEIRO</div>

          <div style={styles.row}>
            <div style={styles.half}>
              <SummaryCard
                eyebrow="VALOR_INVESTIDO"
                title={formatCurrency(investedValue)}
                detail="Base de cálculo do plano"
                tone={investedValue > 0 ? "success" : "default"}
              />
            </div>
            <div style={styles.half}>
              <SummaryCard
                eyebrow="CAIXA_DISPONIVEL"
                title={formatCurrency(cashAvailable)}
                detail="Recursos disponíveis em caixa"
                tone={cashAvailable > 0 ? "success" : "default"}
                trailing={
                  <PrimaryButton
                    label={isEditingCash ? "Cancelar" : "Editar"}
                    onPress={() => {
                      setIsEditingCash((current) => !current);
                      setCashError(null);
                    }}
                    tone="neutral"
                    disabled={isSavingCash}
                  />
                }
              />
            </div>
          </div>

          {isEditingCash ? (
            <div style={styles.cashEditor}>
              <label style={styles.inputGroup}>
                <span style={styles.inputLabel}>Valor atual em caixa</span>
                <input
                  value={cashInput}
                  onChange={(event) => {
                    setCashInput(event.target.value);
                    setCashError(null);
                  }}
                  inputMode="decimal"
                  placeholder="0,00"
                  style={{
                    ...styles.input,
                    borderColor: cashInputIsInvalid ? colors.danger : colors.border,
                  }}
                />
              </label>
              <div style={styles.editorActions}>
                <PrimaryButton
                  label={isSavingCash ? "Salvando..." : "Salvar caixa"}
                  onPress={saveCashBalance}
                  disabled={isSavingCash || cashInputIsInvalid}
                />
              </div>
              {cashError ? (
                <InlineAlert title="Nao foi possivel alterar o caixa" message={cashError} tone="danger" />
              ) : null}
            </div>
          ) : null}

          <div style={styles.row}>
            <div style={styles.half}>
              <SummaryCard
                eyebrow="CUSTO_REBALANCEAMENTO"
                title={formatSignedCurrency(rebalanceCost)}
                detail="Total estimado das ordens"
                tone={rebalanceCost > 0 ? "warning" : "default"}
              />
            </div>
            <div style={styles.half}>
              <SummaryCard
                eyebrow="CAIXA_POS_REBALANCEAMENTO"
                title={formatCurrency(cashAfterRebalance)}
                detail="Caixa estimado após as ordens"
                tone={cashAfterRebalance >= 0 ? "success" : "warning"}
              />
              {cashWasClipped ? (
                <InlineAlert
                  title="Caixa insuficiente"
                  message="O plano de rebalanceamento consumiria mais caixa do que o disponível. Considere reduzir o valor das ordens de compra ou aguardar novas receitas."
                  tone="warning"
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Empty state when no rebalance data and no error */}
      {!rebalance.isLoading && !rebalData && !rebalanceError ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyTitle}>Nenhum dado disponível</div>
          <div style={styles.emptyText}>
            Faça login ou aguarde o carregamento do portfólio para visualizar
            o plano de rebalanceamento.
          </div>
        </div>
      ) : null}
    </Screen>
    </AuthGuard>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.md,
  },
  sectionLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  row: {
    display: "flex",
    gap: layout.space.md,
  },
  half: {
    flex: 1,
    minWidth: 0,
  },
  cashEditor: {
    backgroundColor: colors.accentPanel,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    borderWidth: 1,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    gap: layout.space.md,
    padding: layout.space.lg,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: layout.space.xs,
  },
  inputLabel: {
    color: colors.textSoft,
    fontFamily: typography.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: layout.radius.sm,
    borderWidth: 1,
    borderStyle: "solid",
    color: colors.text,
    fontFamily: typography.mono,
    fontSize: 22,
    fontWeight: 600,
    lineHeight: "30px",
    minHeight: layout.touch.minimum,
    outline: "none",
    padding: `${layout.space.sm}px ${layout.space.md}px`,
    width: "100%",
  },
  editorActions: {
    alignSelf: "flex-start",
    display: "flex",
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
