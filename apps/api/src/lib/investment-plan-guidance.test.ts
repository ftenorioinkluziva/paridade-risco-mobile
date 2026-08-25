import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInvestmentPlanGuidance,
  initialContributionMessage,
  type InvestmentPlanGuidanceInput,
} from "./investment-plan-guidance";

const baseInput: InvestmentPlanGuidanceInput = {
  executionReady: false,
  eligibleForRebalance: true,
  missingProfileFields: [],
  freshness: "FRESH",
  warnings: [],
  targetBasketName: "Carteira Neutra",
  investedValue: 1000,
  cashForOrders: 4000,
  unresolvedCount: 0,
  analysisStatus: "COMPLETA",
  pendingReviewCount: 0,
};

test("mapeia todos os bloqueios para mensagens e rotas acionáveis", () => {
  const result = buildInvestmentPlanGuidance({
    ...baseInput,
    eligibleForRebalance: false,
    missingProfileFields: ["phone", "birthDate"],
    freshness: "STALE",
    unresolvedCount: 1,
    analysisStatus: "PARCIAL",
    targetBasketName: "Sem cesta ativa",
    warnings: ["Perfil incompleto para rebalanceamento"],
  });

  assert.deepEqual(result.blockers.map((blocker) => blocker.id), ["profile", "freshness", "mapping", "basket"]);
  assert.deepEqual(result.blockers.map((blocker) => blocker.href), ["/perfil", "/pluggy", "/pluggy", "/cestas"]);
  assert.equal(result.blockers[0]?.message, "Para liberar as sugestões, complete seu perfil com telefone e data de nascimento.");
  assert.equal(result.blockers[1]?.message, "Atualize os dados sincronizados para liberar uma prévia segura da carteira.");
  assert.equal(result.blockers[2]?.message, "Revise os investimentos sincronizados antes de considerar o plano da carteira.");
  assert.equal(result.blockers[3]?.message, "Configure ou ative uma cesta para gerar a distribuição sugerida.");
  assert.ok(result.blockers.every((blocker) => !/STALE|UNAVAILABLE|phone|birthDate|executionReady/.test(`${blocker.title} ${blocker.message}`)));
});

test("identifica o primeiro aporte como simulação quando há cesta e caixa", () => {
  const result = buildInvestmentPlanGuidance({
    ...baseInput,
    investedValue: 0,
    cashForOrders: 4000,
  });

  assert.deepEqual(result.blockers, []);
  assert.equal(result.showInitialContribution, true);
  assert.equal(initialContributionMessage, "Você ainda não possui posições investidas. O valor informado será usado como simulação de aporte inicial conforme a cesta ativa.");
});

test("não apresenta aporte inicial quando não existe cesta ativa", () => {
  const result = buildInvestmentPlanGuidance({
    ...baseInput,
    investedValue: 0,
    cashForOrders: 4000,
    targetBasketName: "Sem cesta ativa",
  });

  assert.deepEqual(result.blockers.map((blocker) => blocker.id), ["basket"]);
  assert.equal(result.showInitialContribution, false);
});

test("não apresenta orientações de bloqueio quando o plano está pronto", () => {
  const result = buildInvestmentPlanGuidance({
    ...baseInput,
    executionReady: true,
    freshness: "STALE",
    unresolvedCount: 2,
  });

  assert.deepEqual(result.blockers, []);
});

test("mantém uma orientação segura para bloqueios não classificados", () => {
  const result = buildInvestmentPlanGuidance({
    ...baseInput,
    investedValue: 1200,
    warnings: ["O caixa destinado às ordens não cobre os aportes calculados"],
  });

  assert.deepEqual(result.blockers.map((blocker) => blocker.id), ["fallback"]);
  assert.equal(result.blockers[0]?.actionLabel, "Revisar sincronização");
});
