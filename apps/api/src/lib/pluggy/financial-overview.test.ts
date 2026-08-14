import assert from "node:assert/strict";
import test from "node:test";

import { buildFinancialOverview } from "./financial-overview-rules";

const now = new Date("2026-08-04T12:00:00.000Z");

test("separates card spending from bank payments to avoid double counting", () => {
    const result = buildFinancialOverview({
      now,
      accounts: [
        {
          id: "bank",
          name: "Conta",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          balance: 1000,
          availableBalance: null,
          creditLimit: null,
          availableCreditLimit: null,
          minimumPayment: null,
          balanceDueDate: null,
          balanceCloseDate: null,
          observedAt: now,
        },
        {
          id: "card",
          name: "Cartão",
          type: "CREDIT",
          subtype: "CREDIT_CARD",
          balance: -300,
          availableBalance: null,
          creditLimit: 1000,
          availableCreditLimit: 700,
          minimumPayment: 60,
          balanceDueDate: new Date("2026-08-14T00:00:00.000Z"),
          balanceCloseDate: new Date("2026-08-04T00:00:00.000Z"),
          observedAt: now,
        },
      ],
      transactions: [
        { accountId: "bank", transactionDate: now, amount: 2000, type: "CREDIT", status: "POSTED", category: "Salary", merchantName: null },
        { accountId: "bank", transactionDate: now, amount: -500, type: "DEBIT", status: "POSTED", category: "Housing", merchantName: null },
        { accountId: "bank", transactionDate: now, amount: -100, type: "DEBIT", status: "POSTED", category: "Credit card payment", merchantName: null },
        { accountId: "card", transactionDate: now, amount: -100, type: "CREDIT", status: "POSTED", category: "Dining", merchantName: null },
      ],
    });

    assert.equal(result.cash.balance, 1000);
    assert.deepEqual(result.cashFlow, {
      income: 2000,
      otherInflows: 0,
      expenses: 600,
      bankExpenses: 500,
      cardSpend: 100,
      cardPaymentsExcluded: 100,
      net: 1400,
      transactionCount: 4,
      currentMonth: {
        month: "2026-08",
        income: 2000,
        otherInflows: 0,
        expenses: 600,
        bankExpenses: 500,
        cardSpend: 100,
        cardPaymentsExcluded: 100,
        net: 1400,
        transactionCount: 4,
      },
      previousMonth: {
        month: "2026-07",
        income: 0,
        otherInflows: 0,
        expenses: 0,
        bankExpenses: 0,
        cardSpend: 0,
        cardPaymentsExcluded: 0,
        net: 0,
        transactionCount: 0,
      },
    });
    assert.equal(result.obligations.upcomingTotal, 300);
    assert.equal(result.obligations.cashAfterUpcoming, 700);
    assert.equal(result.liquidityStatus, "SUFICIENTE");
});

test("calculates current and previous calendar month flows", () => {
    const result = buildFinancialOverview({
      now,
      accounts: [{
        id: "bank",
        name: "Conta",
        type: "BANK",
        subtype: "CHECKING_ACCOUNT",
        balance: 1000,
        availableBalance: null,
        creditLimit: null,
        availableCreditLimit: null,
        minimumPayment: null,
        balanceDueDate: null,
        balanceCloseDate: null,
        observedAt: now,
      }],
      transactions: [
        { accountId: "bank", transactionDate: new Date("2026-07-10T12:00:00.000Z"), amount: 3000, type: "CREDIT", status: "POSTED", category: "Salary", merchantName: null },
        { accountId: "bank", transactionDate: new Date("2026-07-15T12:00:00.000Z"), amount: -1200, type: "DEBIT", status: "POSTED", category: "Housing", merchantName: null },
        { accountId: "bank", transactionDate: new Date("2026-08-02T12:00:00.000Z"), amount: 2500, type: "CREDIT", status: "POSTED", category: "Salary", merchantName: null },
        { accountId: "bank", transactionDate: new Date("2026-08-03T12:00:00.000Z"), amount: -700, type: "DEBIT", status: "POSTED", category: "Housing", merchantName: null },
      ],
    });

    assert.equal(result.cashFlow.currentMonth.month, "2026-08");
    assert.equal(result.cashFlow.currentMonth.net, 1800);
    assert.equal(result.cashFlow.currentMonth.transactionCount, 2);
    assert.equal(result.cashFlow.previousMonth.month, "2026-07");
    assert.equal(result.cashFlow.previousMonth.net, 1800);
    assert.equal(result.cashFlow.previousMonth.transactionCount, 2);
});

test("flags insufficient liquidity and missing due date", () => {
    const result = buildFinancialOverview({
      now,
      accounts: [
        {
          id: "bank",
          name: "Conta",
          type: "BANK",
          subtype: "CHECKING_ACCOUNT",
          balance: 100,
          availableBalance: null,
          creditLimit: null,
          availableCreditLimit: null,
          minimumPayment: null,
          balanceDueDate: null,
          balanceCloseDate: null,
          observedAt: now,
        },
        {
          id: "card",
          name: "Cartão",
          type: "CREDIT",
          subtype: "CREDIT_CARD",
          balance: -250,
          availableBalance: null,
          creditLimit: null,
          availableCreditLimit: null,
          minimumPayment: 25,
          balanceDueDate: null,
          balanceCloseDate: null,
          observedAt: now,
        },
      ],
      transactions: [],
    });

    assert.equal(result.liquidityStatus, "NAO_CALCULADA");
    assert.deepEqual(result.obligations.items[0], {
      id: "credit-card-card",
      kind: "CREDIT_CARD_BILL",
      accountId: "card",
      accountName: "Cartão",
      amount: 250,
      minimumPayment: 25,
      dueDate: null,
      status: "SEM_DATA",
    });
    assert.ok(result.warnings.includes("Existe fatura de cartão sem data de vencimento"));
    assert.ok(result.warnings.includes("A liquidez não pode ser calculada para uma obrigação sem vencimento"));
});

test("does not treat credit limit as cash", () => {
    const result = buildFinancialOverview({
      now,
      accounts: [{
        id: "card",
        name: "Cartão",
        type: "CREDIT",
        subtype: "CREDIT_CARD",
        balance: 0,
        availableBalance: null,
        creditLimit: 300000,
        availableCreditLimit: 300000,
        minimumPayment: 0,
        balanceDueDate: null,
        balanceCloseDate: null,
        observedAt: now,
      }],
      transactions: [],
    });

    assert.equal(result.cash.balance, 0);
    assert.equal(result.credit.totalCreditLimit, 300000);
    assert.equal(result.liquidityStatus, "NAO_CALCULADA");
});
