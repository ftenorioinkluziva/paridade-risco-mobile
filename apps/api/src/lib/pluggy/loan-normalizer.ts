import type { PluggyResource } from "./client";

type LoanPathPart = string | number;

function valueAt(resource: PluggyResource, path: LoanPathPart[]) {
  let current: unknown = resource;
  for (const part of path) {
    if (current === null || typeof current !== "object") return undefined;
    if (Array.isArray(current) && typeof part === "number") {
      current = current[part];
      continue;
    }
    if (!Array.isArray(current) && typeof part === "string") {
      current = (current as Record<string, unknown>)[part];
      continue;
    }
    return undefined;
  }
  return current;
}

function firstString(resource: PluggyResource, paths: LoanPathPart[][]) {
  for (const path of paths) {
    const value = valueAt(resource, path);
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function firstNumber(resource: PluggyResource, paths: LoanPathPart[][]) {
  const value = firstString(resource, paths);
  return value !== null && Number.isFinite(Number(value)) ? value : null;
}

function firstDate(resource: PluggyResource, paths: LoanPathPart[][]) {
  const value = firstString(resource, paths);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizePluggyLoan(source: PluggyResource) {
  const sourceLoanId = firstString(source, [["id"]]);
  if (!sourceLoanId) throw new Error("Pluggy loan is missing id");

  return {
    sourceLoanId,
    // Pluggy's canonical Loan contract uses productName and contractAmount.
    name: firstString(source, [["productName"], ["name"], ["description"]]),
    status: firstString(source, [["status"]]),
    originalAmount: firstNumber(source, [["contractAmount"], ["amount"], ["originalAmount"]]),
    // The current outstanding balance is nested under payments in the Loans API.
    outstandingBalance: firstNumber(source, [
      ["payments", "contractOutstandingBalance"],
      ["outstandingBalance"],
      ["balance"],
    ]),
    // Connectors may expose an installment amount either directly or inside an installment list.
    installmentAmount: firstNumber(source, [
      ["installments", "installmentAmount"],
      ["installments", "nextInstallmentAmount"],
      ["installments", "amount"],
      ["installments", "regularInstallments", 0, "amount", "value"],
      ["installments", "items", 0, "amount", "value"],
      ["installmentAmount"],
      ["installmentValue"],
    ]),
    // Keep the first explicit rate available; CET and the full rate array remain in rawData.
    interestRate: firstNumber(source, [
      ["interestRate"],
      ["rate"],
      ["interestRates", 0, "preFixedRate"],
    ]),
    nextDueDate: firstDate(source, [["nextDueDate"]]),
    // Pluggy's dueDate is the contract's informed final/maturity date, not necessarily the next installment.
    maturityDate: firstDate(source, [["maturityDate"], ["dueDate"], ["endDate"]]),
  };
}
