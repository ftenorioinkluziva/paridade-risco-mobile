import assert from "node:assert/strict";
import test from "node:test";

import { buildFinancialHealthOverview } from "./financial-health-rules";
import type { PluggyFinancialOverview } from "./financial-overview";

const now = new Date("2026-08-04T12:00:00.000Z");
const financial = (overrides: Partial<PluggyFinancialOverview> = {}): PluggyFinancialOverview => ({
  source: "PLUGGY",
  generatedAt: now.toISOString(),
  freshness: { latestObservedAt: now.toISOString(), latestSyncAt: now.toISOString() },
  period: { from: "2026-05-07T12:00:00.000Z", to: now.toISOString(), days: 90 },
  cash: { balance: 1000, availableBalance: 1000, accounts: [] },
  credit: {
    cards: [{
      id: "card",
      name: "Cartão",
      balance: -200,
      balanceDue: 200,
      creditLimit: 1000,
      availableCredit: 800,
      creditUtilization: 0.2,
      minimumPayment: 20,
      balanceDueDate: "2026-08-14T00:00:00.000Z",
      balanceCloseDate: null,
      obligationStatus: "PROXIMA",
      observedAt: now.toISOString(),
    }],
    totalBalanceDue: 200,
    totalCreditLimit: 1000,
  },
  cashFlow: {
    income: 2000,
    otherInflows: 0,
    expenses: 1000,
    bankExpenses: 1000,
    cardSpend: 0,
    cardPaymentsExcluded: 0,
    net: 1000,
    transactionCount: 1,
    currentMonth: { month: "2026-08", income: 2000, otherInflows: 0, expenses: 1000, bankExpenses: 1000, cardSpend: 0, cardPaymentsExcluded: 0, net: 1000, transactionCount: 1 },
    previousMonth: { month: "2026-07", income: 1800, otherInflows: 0, expenses: 900, bankExpenses: 900, cardSpend: 0, cardPaymentsExcluded: 0, net: 900, transactionCount: 1 },
  },
  obligations: { items: [], upcomingTotal: 200, cashAfterUpcoming: 800, horizonDays: 30 },
  liquidityStatus: "SUFICIENTE",
  warnings: [],
  ...overrides,
});

test("preserves incomplete loan data instead of converting it to zero", () => {
  const result = buildFinancialHealthOverview({
    now,
    financial: financial(),
    loans: [{
      id: "loan-1",
      name: "Empréstimo Sandbox",
      status: null,
      originalAmount: null,
      outstandingBalance: null,
      installmentAmount: null,
      interestRate: null,
      nextDueDate: null,
      maturityDate: null,
      observedAt: now,
    }],
  });

  assert.equal(result.healthStatus, "INCOMPLETA");
  assert.equal(result.loans.dataStatus, "INCOMPLETA");
  assert.equal(result.loans.totalOutstanding, null);
  assert.ok(result.alerts.some((item) => item.code === "LOAN_DATA_INCOMPLETE"));
});

test("generates explainable alerts for liquidity, negative flow and high card usage", () => {
  const result = buildFinancialHealthOverview({
    now,
    financial: financial({
      cashFlow: {
        income: 1000,
        otherInflows: 0,
        expenses: 1200,
        bankExpenses: 1200,
        cardSpend: 0,
        cardPaymentsExcluded: 0,
        net: -200,
        transactionCount: 2,
        currentMonth: { month: "2026-08", income: 1000, otherInflows: 0, expenses: 1200, bankExpenses: 1200, cardSpend: 0, cardPaymentsExcluded: 0, net: -200, transactionCount: 2 },
        previousMonth: { month: "2026-07", income: 0, otherInflows: 0, expenses: 0, bankExpenses: 0, cardSpend: 0, cardPaymentsExcluded: 0, net: 0, transactionCount: 0 },
      },
      credit: {
        cards: [{
          id: "card",
          name: "Cartão",
          balance: -900,
          balanceDue: 900,
          creditLimit: 1000,
          availableCredit: 100,
          creditUtilization: 0.9,
          minimumPayment: 90,
          balanceDueDate: "2026-08-14T00:00:00.000Z",
          balanceCloseDate: null,
          obligationStatus: "PROXIMA",
          observedAt: now.toISOString(),
        }],
        totalBalanceDue: 900,
        totalCreditLimit: 1000,
      },
      obligations: { items: [], upcomingTotal: 900, cashAfterUpcoming: -400, horizonDays: 30 },
      liquidityStatus: "INSUFICIENTE",
    }),
    loans: [{
      id: "loan-1",
      name: "Empréstimo",
      status: "ACTIVE",
      originalAmount: 5000,
      outstandingBalance: 3000,
      installmentAmount: 100,
      interestRate: 0.02,
      nextDueDate: new Date("2026-08-20T00:00:00.000Z"),
      maturityDate: new Date("2028-08-20T00:00:00.000Z"),
      observedAt: now,
    }],
  });

  assert.equal(result.healthStatus, "ATENCAO");
  assert.deepEqual(result.loans, {
    dataStatus: "DISPONIVEL",
    items: [{
      id: "loan-1",
      name: "Empréstimo",
      status: "ACTIVE",
      originalAmount: 5000,
      outstandingBalance: 3000,
      installmentAmount: 100,
      interestRate: 0.02,
      nextDueDate: "2026-08-20T00:00:00.000Z",
      maturityDate: "2028-08-20T00:00:00.000Z",
      dataStatus: "DISPONIVEL",
      observedAt: now.toISOString(),
    }],
    totalOutstanding: 3000,
    totalInstallment: 100,
    nextDueDate: "2026-08-20T00:00:00.000Z",
  });
  assert.ok(result.alerts.some((item) => item.code === "LIQUIDITY_INSUFFICIENT" && item.severity === "HIGH"));
  assert.ok(result.alerts.some((item) => item.code === "NEGATIVE_CASH_FLOW"));
  assert.ok(result.alerts.some((item) => item.code === "CREDIT_UTILIZATION_HIGH"));
  assert.equal(result.indicators.debtServiceToIncome, 0.1);
});
