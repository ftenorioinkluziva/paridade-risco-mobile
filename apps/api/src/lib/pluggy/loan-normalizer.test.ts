import assert from "node:assert/strict";
import test from "node:test";

import { normalizePluggyLoan } from "./loan-normalizer";

test("normalizes the canonical Pluggy Loan payload", () => {
  const result = normalizePluggyLoan({
    id: "loan-1",
    productName: "Crédito Pessoal Consignado",
    contractAmount: 50000,
    dueDate: "2028-01-15T00:00:00.000Z",
    interestRates: [{ preFixedRate: 0.6 }],
    installments: {
      dueInstallments: 57,
      paidInstallments: 73,
      totalNumberOfInstallments: 130632,
    },
    payments: { contractOutstandingBalance: 1000.04 },
  });

  assert.deepEqual(result, {
    sourceLoanId: "loan-1",
    name: "Crédito Pessoal Consignado",
    status: null,
    originalAmount: "50000",
    outstandingBalance: "1000.04",
    installmentAmount: null,
    interestRate: "0.6",
    nextDueDate: null,
    maturityDate: new Date("2028-01-15T00:00:00.000Z"),
  });
});

test("keeps incomplete canonical Loan fields null", () => {
  const result = normalizePluggyLoan({ id: "loan-2", productName: "Empréstimo sem detalhes" });

  assert.equal(result.name, "Empréstimo sem detalhes");
  assert.equal(result.originalAmount, null);
  assert.equal(result.outstandingBalance, null);
  assert.equal(result.installmentAmount, null);
  assert.equal(result.nextDueDate, null);
  assert.equal(result.maturityDate, null);
});
