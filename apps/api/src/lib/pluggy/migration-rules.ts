import type { PortfolioProviderSnapshot } from "@/lib/portfolio-provider";
import type { DualReadStatus } from "@/lib/portfolio-dual-read-rules";

export type PortfolioSourceMode = "MANUAL" | "PLUGGY" | "DUAL_READ";
export type MigrationReadinessStatus = "READY" | "BLOCKED";

export interface MigrationReadinessInput {
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

export function buildMigrationReadiness(input: MigrationReadinessInput) {
  const currentMode = input.currentMode ?? "MANUAL";
  const ignoreManualReconciliation = input.ignoreManualReconciliation ?? false;
  const blockers: string[] = [];
  const warnings: string[] = [];
  const unmappedWarning = input.pluggy.warnings.find((warning) => warning.includes("aguardam decisão estratégica") || warning.includes("sem mapeamento"));

  if (input.comparison.status !== "ALINHADO" && !ignoreManualReconciliation) {
    blockers.push("Dual-read divergente: reconcilie totais, caixa e posições antes da troca");
  }
  if (unmappedWarning) {
    blockers.push(unmappedWarning);
  }
  if (input.manual.warnings.length > 0 && !ignoreManualReconciliation) {
    blockers.push("A fonte manual possui dados sem detalhe suficiente para reconciliação");
  }
  if (input.pluggy.positions.length === 0 && input.manual.positions.length > 0) {
    blockers.push("O Pluggy ainda não possui posições estratégicas mapeadas");
  }
  if (input.pluggy.warnings.some((warning) => warning.includes("custo original"))) {
    warnings.push("Há posições Pluggy sem custo original; a troca pode preservar a alocação, mas não toda a rentabilidade");
  }
  if (ignoreManualReconciliation) {
    warnings.push("Sandbox experimental: a carteira manual foi desconsiderada como baseline por conter dados fictícios");
  }

  const canSwitchToPluggy = blockers.length === 0;
  return {
    source: "PLUGGY" as const,
    generatedAt: new Date().toISOString(),
    currentMode,
    candidateMode: "PLUGGY" as const,
    status: canSwitchToPluggy ? "READY" as const : "BLOCKED" as const,
    canSwitchToPluggy,
    manualCrudStatus: "ACTIVE" as const,
    manualCrud: {
      transactions: "ACTIVE" as const,
      funds: "ACTIVE" as const,
      reason: canSwitchToPluggy
        ? "O CRUD manual permanece disponível durante o período de compatibilidade"
        : "O CRUD manual deve permanecer ativo enquanto a reconciliação estiver bloqueada",
    },
    reconciliation: {
      status: input.comparison.status,
      considered: !ignoreManualReconciliation,
      baseline: ignoreManualReconciliation ? "PLUGGY_ONLY_SANDBOX" as const : "MANUAL_AND_PLUGGY" as const,
    },
    comparison: input.comparison,
    blockers,
    warnings,
    nextAction: currentMode === "PLUGGY"
      ? "Fonte Pluggy ativa; o CRUD manual permanece disponível para compatibilidade"
      : canSwitchToPluggy
        ? "Revisar e aprovar explicitamente a troca da fonte da carteira"
      : "Mapear posições Pluggy e reconciliar a divergência do dual-read",
  };
}
