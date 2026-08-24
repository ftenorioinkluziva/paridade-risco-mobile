import type { PortfolioProviderSnapshot } from "@/lib/portfolio-provider";
import type { DualReadStatus } from "@/lib/portfolio-dual-read-rules";

export type PortfolioSourceMode = "MANUAL" | "PLUGGY" | "DUAL_READ";
export type SourceActivationReadinessStatus = "READY" | "BLOCKED";

export interface SourceActivationReadinessInput {
  manual: PortfolioProviderSnapshot;
  pluggy: PortfolioProviderSnapshot;
  comparison: {
    status: DualReadStatus;
    totalValueDelta: number;
    investedValueDelta: number;
    cashBalanceDelta: number;
    positionValueDelta: number;
  };
  currentMode?: PortfolioSourceMode;
  ignoreManualReconciliation?: boolean;
}

export function buildSourceActivationReadiness(input: SourceActivationReadinessInput) {
  const currentMode = input.currentMode ?? "MANUAL";
  const ignoreManualReconciliation = input.ignoreManualReconciliation ?? false;
  const hasManualPortfolioData = input.manual.positions.length > 0
    || Math.abs(input.manual.totalValue) > 0.01
    || Math.abs(input.manual.cashBalance) > 0.01
    || input.manual.warnings.length > 0;
  const manualReconciliationRequired = hasManualPortfolioData && !ignoreManualReconciliation;
  const blockers: string[] = [];
  const warnings: string[] = [];
  const unmappedWarning = input.pluggy.warnings.find((warning) => warning.includes("aguardam decisão estratégica") || warning.includes("sem mapeamento"));

  if (input.comparison.status !== "ALINHADO" && manualReconciliationRequired) {
    blockers.push("Dual-read divergente: reconcilie totais, caixa e posições antes da ativação");
  }
  if (unmappedWarning) {
    blockers.push(unmappedWarning);
  }
  if (input.manual.warnings.length > 0 && manualReconciliationRequired) {
    blockers.push("A fonte manual possui dados sem detalhe suficiente para reconciliação");
  }
  if (input.pluggy.positions.length === 0) {
    blockers.push("O Pluggy ainda não possui posições estratégicas mapeadas; sincronize e revise os investimentos antes da ativação");
  }
  if (input.pluggy.warnings.some((warning) => warning.includes("custo original"))) {
    warnings.push("Há posições Pluggy sem custo original; a troca pode preservar a alocação, mas não toda a rentabilidade");
  }
  if (ignoreManualReconciliation) {
    warnings.push("Sandbox experimental: a carteira manual foi desconsiderada como baseline por conter dados fictícios");
  } else if (!hasManualPortfolioData) {
    warnings.push("Conta nova: não há carteira manual para reconciliar; a ativação depende de dados Pluggy sincronizados e mapeados");
  }

  const canActivatePluggy = blockers.length === 0;
  return {
    source: "PLUGGY" as const,
    generatedAt: new Date().toISOString(),
    currentMode,
    candidateMode: "PLUGGY" as const,
    status: canActivatePluggy ? "READY" as const : "BLOCKED" as const,
    canActivatePluggy,
    // External compatibility field. Remove only after the documented API sunset.
    canSwitchToPluggy: canActivatePluggy,
    manualCrudStatus: "DISABLED" as const,
    manualCrud: {
      transactions: "DISABLED" as const,
      funds: "DISABLED" as const,
      reason: "Escritas manuais desativadas; Pluggy é a fonte operacional",
    },
    reconciliation: {
      status: input.comparison.status,
      considered: manualReconciliationRequired,
      baseline: ignoreManualReconciliation
        ? "PLUGGY_ONLY_SANDBOX" as const
        : hasManualPortfolioData ? "MANUAL_AND_PLUGGY" as const : "PLUGGY_ONLY_NEW_ACCOUNT" as const,
    },
    comparison: input.comparison,
    blockers,
    warnings,
    nextAction: currentMode === "PLUGGY"
      ? "Fonte Pluggy ativa; o CRUD manual permanece disponível para compatibilidade"
      : canActivatePluggy
        ? "Revisar e aprovar explicitamente a ativação da fonte Pluggy"
      : "Sincronizar e mapear posições Pluggy antes de ativar a fonte",
  };
}
