export type InvestmentPlanGuidanceInput = {
  executionReady?: boolean;
  eligibleForRebalance?: boolean;
  missingProfileFields?: string[];
  freshness?: string | null;
  warnings?: string[];
  targetBasketName?: string | null;
  investedValue: number;
  cashForOrders: number;
  unresolvedCount?: number;
  analysisStatus?: string | null;
  pendingReviewCount?: number;
};

export type InvestmentPlanGuidanceBlocker = {
  id: "profile" | "freshness" | "mapping" | "basket" | "fallback";
  title: string;
  message: string;
  actionLabel: string;
  href: "/perfil" | "/pluggy" | "/cestas";
};

export type InvestmentPlanGuidance = {
  blockers: InvestmentPlanGuidanceBlocker[];
  showInitialContribution: boolean;
};

const noActiveBasketLabel = "Sem cesta ativa";

export const initialContributionMessage = "Você ainda não possui posições investidas. O valor informado será usado como simulação de aporte inicial conforme a cesta ativa.";

export function buildInvestmentPlanGuidance(input: InvestmentPlanGuidanceInput): InvestmentPlanGuidance {
  const warnings = input.warnings ?? [];
  const hasActiveBasket = Boolean(input.targetBasketName && input.targetBasketName !== noActiveBasketLabel);
  const showInitialContribution = hasActiveBasket && input.investedValue === 0 && input.cashForOrders > 0;

  if (input.executionReady !== false) {
    return { blockers: [], showInitialContribution };
  }

  const blockers = buildKnownBlockers(input, warnings, hasActiveBasket);
  if (blockers.length === 0 && !showInitialContribution) {
    blockers.push({
      id: "fallback",
      title: "Dados da carteira precisam de revisão",
      message: "Revise os dados sincronizados para liberar uma prévia segura da carteira.",
      actionLabel: "Revisar sincronização",
      href: "/pluggy",
    });
  }

  return { blockers, showInitialContribution };
}

function buildKnownBlockers(
  input: InvestmentPlanGuidanceInput,
  warnings: string[],
  hasActiveBasket: boolean,
): InvestmentPlanGuidanceBlocker[] {
  const hasProfileBlocker = Boolean(
    input.eligibleForRebalance === false
      || (input.missingProfileFields?.length ?? 0) > 0
      || warnings.some((warning) => /perfil incompleto/i.test(warning)),
  );
  const hasFreshnessBlocker = Boolean(
    (input.freshness && input.freshness !== "FRESH")
      || warnings.some((warning) => /dados pluggy/i.test(warning) && /atualize a sincronização/i.test(warning)),
  );
  const hasMappingBlocker = Boolean(
    (input.unresolvedCount ?? 0) > 0
      || (input.pendingReviewCount ?? 0) > 0
      || input.analysisStatus === "PARCIAL"
      || warnings.some((warning) => /sem mapeamento|aguardam decisão estratégica/i.test(warning)),
  );
  const hasBasketBlocker = Boolean(
    !hasActiveBasket
      || warnings.some((warning) => /nenhuma cesta ativa/i.test(warning)),
  );

  return [
    hasProfileBlocker ? {
      id: "profile",
      title: "Perfil incompleto",
      message: "Para liberar as sugestões, complete seu perfil com telefone e data de nascimento.",
      actionLabel: "Completar perfil",
      href: "/perfil",
    } : null,
    hasFreshnessBlocker ? {
      id: "freshness",
      title: "Dados sincronizados precisam de atualização",
      message: "Atualize os dados sincronizados para liberar uma prévia segura da carteira.",
      actionLabel: "Revisar sincronização",
      href: "/pluggy",
    } : null,
    hasMappingBlocker ? {
      id: "mapping",
      title: "Investimentos aguardam revisão",
      message: "Revise os investimentos sincronizados antes de considerar o plano da carteira.",
      actionLabel: "Revisar mapeamentos",
      href: "/pluggy",
    } : null,
    hasBasketBlocker ? {
      id: "basket",
      title: "Cesta ativa necessária",
      message: "Configure ou ative uma cesta para gerar a distribuição sugerida.",
      actionLabel: "Ver cestas",
      href: "/cestas",
    } : null,
  ].filter((blocker): blocker is InvestmentPlanGuidanceBlocker => blocker !== null);
}
