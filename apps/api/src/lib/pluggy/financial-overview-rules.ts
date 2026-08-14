export type FinancialLiquidityStatus = "SUFICIENTE" | "INSUFICIENTE" | "NAO_CALCULADA";
export type FinancialObligationStatus = "VENCIDA" | "PROXIMA" | "FUTURA" | "SEM_DATA";

export interface FinancialAccountInput {
  id: string;
  name: string;
  type: string | null;
  subtype: string | null;
  balance: number | null;
  availableBalance: number | null;
  creditLimit: number | null;
  availableCreditLimit: number | null;
  minimumPayment: number | null;
  balanceDueDate: Date | null;
  balanceCloseDate: Date | null;
  observedAt: Date;
}

export interface FinancialTransactionInput {
  accountId: string;
  transactionDate: Date | null;
  amount: number | null;
  type: string | null;
  status: string | null;
  category: string | null;
  merchantName: string | null;
}

export interface FinancialOverviewInput {
  accounts: FinancialAccountInput[];
  transactions: FinancialTransactionInput[];
  now?: Date;
  periodDays?: number;
  obligationHorizonDays?: number;
  latestSyncAt?: Date | null;
}

type CashFlowSummary = {
  income: number;
  otherInflows: number;
  expenses: number;
  bankExpenses: number;
  cardSpend: number;
  cardPaymentsExcluded: number;
  net: number;
  transactionCount: number;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeText(value: string | null) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function maxDate(dates: Array<Date | null>) {
  return dates.reduce<Date | null>((latest, date) => {
    if (!date || (latest && latest >= date)) return latest;
    return date;
  }, null);
}

function monthStart(date: Date, offset = 0) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isFinancialCreditCard(account: Pick<FinancialAccountInput, "type" | "subtype">) {
  return normalizeText(account.type) === "credit" || normalizeText(account.subtype) === "credit_card";
}

export function isFinancialBankAccount(account: Pick<FinancialAccountInput, "type" | "subtype">) {
  return normalizeText(account.type) === "bank" && !isFinancialCreditCard(account);
}

export function isPostedTransaction(transaction: Pick<FinancialTransactionInput, "status">) {
  const status = normalizeText(transaction.status);
  return !status || !["pending", "canceled", "cancelled", "declined", "rejected"].includes(status);
}

export function isCreditCardPayment(transaction: Pick<FinancialTransactionInput, "category" | "merchantName" | "type">) {
  const text = `${normalizeText(transaction.category)} ${normalizeText(transaction.merchantName)}`;
  return text.includes("credit card payment") || text.includes("pagamento de cartao") || text.includes("pagamento de cartão");
}

function obligationStatus(dueDate: Date | null, now: Date, horizonDays: number): FinancialObligationStatus {
  if (!dueDate) return "SEM_DATA";
  if (dueDate < now) return "VENCIDA";
  return dueDate <= addDays(now, horizonDays) ? "PROXIMA" : "FUTURA";
}

function summarizeCard(account: FinancialAccountInput, now: Date, horizonDays: number) {
  const balanceDue = roundMoney(Math.max(0, Math.abs(account.balance ?? 0)));
  const creditLimit = account.creditLimit === null ? null : roundMoney(Math.max(0, account.creditLimit));
  const availableCredit = account.availableCreditLimit === null
    ? (creditLimit === null ? null : roundMoney(Math.max(0, creditLimit - balanceDue)))
    : roundMoney(Math.max(0, account.availableCreditLimit));
  const utilization = creditLimit && creditLimit > 0 ? roundMoney(balanceDue / creditLimit) : null;
  const minimumPayment = account.minimumPayment === null
    ? null
    : roundMoney(Math.min(balanceDue, Math.max(0, account.minimumPayment)));
  const status = obligationStatus(account.balanceDueDate, now, horizonDays);

  return {
    id: account.id,
    name: account.name,
    balance: roundMoney(account.balance ?? 0),
    balanceDue,
    creditLimit,
    availableCredit,
    creditUtilization: utilization,
    minimumPayment,
    balanceDueDate: account.balanceDueDate?.toISOString() ?? null,
    balanceCloseDate: account.balanceCloseDate?.toISOString() ?? null,
    obligationStatus: status,
    observedAt: account.observedAt.toISOString(),
  };
}

function summarizeCashFlow(transactions: FinancialTransactionInput[], accountById: Map<string, FinancialAccountInput>): CashFlowSummary {
  const income = transactions.reduce((sum, transaction) => {
    const account = accountById.get(transaction.accountId);
    const amount = transaction.amount ?? 0;
    return account && isFinancialBankAccount(account) && amount > 0 ? sum + amount : sum;
  }, 0);
  const otherInflows = transactions.reduce((sum, transaction) => {
    const account = accountById.get(transaction.accountId);
    const amount = transaction.amount ?? 0;
    return account && isFinancialCreditCard(account) && amount > 0 ? sum + amount : sum;
  }, 0);
  const bankExpenses = transactions.reduce((sum, transaction) => {
    const account = accountById.get(transaction.accountId);
    const amount = transaction.amount ?? 0;
    if (!account || !isFinancialBankAccount(account) || amount >= 0 || isCreditCardPayment(transaction)) return sum;
    return sum + Math.abs(amount);
  }, 0);
  const cardSpend = transactions.reduce((sum, transaction) => {
    const account = accountById.get(transaction.accountId);
    const amount = transaction.amount ?? 0;
    return account && isFinancialCreditCard(account) && amount < 0 ? sum + Math.abs(amount) : sum;
  }, 0);
  const cardPaymentsExcluded = transactions.reduce((sum, transaction) => {
    const account = accountById.get(transaction.accountId);
    const amount = transaction.amount ?? 0;
    return account && isFinancialBankAccount(account) && amount < 0 && isCreditCardPayment(transaction)
      ? sum + Math.abs(amount)
      : sum;
  }, 0);

  return {
    income: roundMoney(income),
    otherInflows: roundMoney(otherInflows),
    expenses: roundMoney(bankExpenses + cardSpend),
    bankExpenses: roundMoney(bankExpenses),
    cardSpend: roundMoney(cardSpend),
    cardPaymentsExcluded: roundMoney(cardPaymentsExcluded),
    net: roundMoney(income + otherInflows - bankExpenses - cardSpend),
    transactionCount: transactions.length,
  };
}

export function buildFinancialOverview(input: FinancialOverviewInput) {
  const now = input.now ?? new Date();
  const periodDays = Math.max(1, Math.floor(input.periodDays ?? 90));
  const obligationHorizonDays = Math.max(0, Math.floor(input.obligationHorizonDays ?? 30));
  const periodFrom = addDays(now, -(periodDays - 1));
  const accountById = new Map(input.accounts.map((account) => [account.id, account]));
  const cashAccounts = input.accounts.filter(isFinancialBankAccount);
  const cardAccounts = input.accounts.filter(isFinancialCreditCard);
  const postedTransactions = input.transactions.filter((transaction) => isPostedTransaction(transaction));
  const periodTransactions = postedTransactions.filter((transaction) => (
    transaction.transactionDate !== null &&
    transaction.transactionDate >= periodFrom &&
    transaction.transactionDate <= now
  ));

  const periodCashFlow = summarizeCashFlow(periodTransactions, accountById);
  const currentMonthStart = monthStart(now);
  const previousMonthStart = monthStart(now, -1);
  const currentMonthCashFlow = summarizeCashFlow(postedTransactions.filter((transaction) => (
    transaction.transactionDate !== null &&
    transaction.transactionDate >= currentMonthStart &&
    transaction.transactionDate <= now
  )), accountById);
  const previousMonthCashFlow = summarizeCashFlow(postedTransactions.filter((transaction) => (
    transaction.transactionDate !== null &&
    transaction.transactionDate >= previousMonthStart &&
    transaction.transactionDate < currentMonthStart
  )), accountById);
  const cashBalance = cashAccounts.reduce((sum, account) => sum + (account.balance ?? 0), 0);
  const cards = cardAccounts.map((account) => summarizeCard(account, now, obligationHorizonDays));
  const obligations = cards
    .filter((card) => card.balanceDue > 0)
    .map((card) => ({
      id: `credit-card-${card.id}`,
      kind: "CREDIT_CARD_BILL" as const,
      accountId: card.id,
      accountName: card.name,
      amount: card.balanceDue,
      minimumPayment: card.minimumPayment,
      dueDate: card.balanceDueDate,
      status: card.obligationStatus,
    }));
  const upcomingObligations = obligations.filter((obligation) => obligation.status === "VENCIDA" || obligation.status === "PROXIMA");
  const upcomingObligationsTotal = upcomingObligations.reduce((sum, obligation) => sum + obligation.amount, 0);
  const warnings: string[] = [];

  if (cashAccounts.length === 0) warnings.push("Nenhuma conta bancária Pluggy disponível para calcular caixa");
  if (cardAccounts.length === 0) warnings.push("Nenhum cartão Pluggy sincronizado");
  if (periodTransactions.length === 0) warnings.push(`Nenhuma transação Pluggy no período de ${periodDays} dias`);
  if (cards.some((card) => card.balanceDue > 0 && card.obligationStatus === "SEM_DATA")) {
    warnings.push("Existe fatura de cartão sem data de vencimento");
    warnings.push("A liquidez não pode ser calculada para uma obrigação sem vencimento");
  }
  if (cashAccounts.length > 0 && cashBalance < upcomingObligationsTotal) {
    warnings.push("O caixa bancário não cobre as obrigações de cartão próximas");
  }

  const hasObligationWithoutDate = obligations.some((obligation) => obligation.status === "SEM_DATA");
  const liquidityStatus: FinancialLiquidityStatus = cashAccounts.length === 0 || hasObligationWithoutDate
    ? "NAO_CALCULADA"
    : cashBalance >= upcomingObligationsTotal ? "SUFICIENTE" : "INSUFICIENTE";
  const latestObservedAt = maxDate([
    ...input.accounts.map((account) => account.observedAt),
    ...input.transactions.map((transaction) => transaction.transactionDate),
  ]);

  return {
    source: "PLUGGY" as const,
    generatedAt: now.toISOString(),
    freshness: {
      latestObservedAt: latestObservedAt?.toISOString() ?? null,
      latestSyncAt: input.latestSyncAt?.toISOString() ?? null,
    },
    period: {
      from: periodFrom.toISOString(),
      to: now.toISOString(),
      days: periodDays,
    },
    cash: {
      balance: roundMoney(cashBalance),
      availableBalance: roundMoney(cashAccounts.reduce((sum, account) => sum + (account.availableBalance ?? account.balance ?? 0), 0)),
      accounts: cashAccounts.map((account) => ({
        id: account.id,
        name: account.name,
        balance: roundMoney(account.balance ?? 0),
        availableBalance: account.availableBalance === null ? null : roundMoney(account.availableBalance),
        observedAt: account.observedAt.toISOString(),
      })),
    },
    credit: {
      cards,
      totalBalanceDue: roundMoney(cards.reduce((sum, card) => sum + card.balanceDue, 0)),
      totalCreditLimit: roundMoney(cards.reduce((sum, card) => sum + (card.creditLimit ?? 0), 0)),
    },
    cashFlow: {
      ...periodCashFlow,
      currentMonth: { month: monthKey(currentMonthStart), ...currentMonthCashFlow },
      previousMonth: { month: monthKey(previousMonthStart), ...previousMonthCashFlow },
    },
    obligations: {
      items: obligations,
      upcomingTotal: roundMoney(upcomingObligationsTotal),
      cashAfterUpcoming: roundMoney(cashBalance - upcomingObligationsTotal),
      horizonDays: obligationHorizonDays,
    },
    liquidityStatus,
    warnings,
  };
}
