import type { PluggyFinancialOverview } from "./financial-overview";

export type LoanDataStatus = "DISPONIVEL" | "INCOMPLETA" | "SEM_REGISTROS";
export type FinancialHealthStatus = "ESTAVEL" | "ATENCAO" | "INCOMPLETA";
export type FinancialAlertSeverity = "INFO" | "MEDIUM" | "HIGH";

export interface FinancialLoanInput {
  id: string;
  name: string | null;
  status: string | null;
  originalAmount: number | null;
  outstandingBalance: number | null;
  installmentAmount: number | null;
  interestRate: number | null;
  nextDueDate: Date | null;
  maturityDate: Date | null;
  observedAt: Date;
}

export interface FinancialHealthInput {
  financial: PluggyFinancialOverview;
  loans: FinancialLoanInput[];
  now?: Date;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function loanStatus(loan: FinancialLoanInput) {
  return loan.outstandingBalance !== null && loan.installmentAmount !== null && loan.nextDueDate !== null
    ? "DISPONIVEL" as const
    : "INCOMPLETA" as const;
}

function minDate(dates: Array<Date | null>) {
  return dates.reduce<Date | null>((earliest, date) => {
    if (!date || (earliest && earliest <= date)) return earliest;
    return date;
  }, null);
}

function alert(code: string, severity: FinancialAlertSeverity, message: string, source: string) {
  return { code, severity, message, source };
}

export function buildFinancialHealthOverview(input: FinancialHealthInput) {
  const now = input.now ?? new Date();
  const loans = input.loans.map((loan) => ({
    id: loan.id,
    name: loan.name,
    status: loan.status,
    originalAmount: loan.originalAmount === null ? null : roundMoney(loan.originalAmount),
    outstandingBalance: loan.outstandingBalance === null ? null : roundMoney(Math.max(0, loan.outstandingBalance)),
    installmentAmount: loan.installmentAmount === null ? null : roundMoney(Math.max(0, loan.installmentAmount)),
    interestRate: loan.interestRate,
    nextDueDate: loan.nextDueDate?.toISOString() ?? null,
    maturityDate: loan.maturityDate?.toISOString() ?? null,
    dataStatus: loanStatus(loan),
    observedAt: loan.observedAt.toISOString(),
  }));
  const loanDataStatus: LoanDataStatus = loans.length === 0
    ? "SEM_REGISTROS"
    : loans.every((loan) => loan.dataStatus === "DISPONIVEL") ? "DISPONIVEL" : "INCOMPLETA";
  const totalOutstanding = loans.every((loan) => loan.outstandingBalance !== null)
    ? roundMoney(loans.reduce((sum, loan) => sum + (loan.outstandingBalance ?? 0), 0))
    : null;
  const totalInstallment = loans.every((loan) => loan.installmentAmount !== null)
    ? roundMoney(loans.reduce((sum, loan) => sum + (loan.installmentAmount ?? 0), 0))
    : null;
  const nextDueDate = minDate(input.loans.map((loan) => loan.nextDueDate));
  const currentMonthCashFlow = input.financial.cashFlow.currentMonth;
  const totalIncome = currentMonthCashFlow.income;
  const debtServiceToIncome = totalInstallment !== null && totalIncome > 0
    ? roundMoney(totalInstallment / totalIncome)
    : null;
  const maxCardUtilization = input.financial.credit.cards.reduce<number | null>((max, card) => {
    if (card.creditUtilization === null) return max;
    return max === null ? card.creditUtilization : Math.max(max, card.creditUtilization);
  }, null);
  const knownDebt = totalOutstanding === null
    ? null
    : roundMoney(totalOutstanding + input.financial.credit.totalBalanceDue);
  const alerts: Array<ReturnType<typeof alert>> = [];

  if (input.financial.liquidityStatus === "INSUFICIENTE") {
    alerts.push(alert("LIQUIDITY_INSUFFICIENT", "HIGH", "O caixa não cobre as obrigações financeiras próximas", "LIQUIDITY"));
  } else if (input.financial.liquidityStatus === "NAO_CALCULADA") {
    alerts.push(alert("LIQUIDITY_UNKNOWN", "MEDIUM", "A liquidez não pôde ser calculada com os dados observados", "LIQUIDITY"));
  }
  if (currentMonthCashFlow.net < 0) {
    alerts.push(alert("NEGATIVE_CASH_FLOW", "MEDIUM", "As saídas do mês atual superaram as entradas", "CASH_FLOW"));
  }
  if (maxCardUtilization !== null && maxCardUtilization >= 0.8) {
    alerts.push(alert("CREDIT_UTILIZATION_HIGH", "MEDIUM", "A utilização de pelo menos um cartão está acima de 80%", "CREDIT"));
  }
  if (input.financial.obligations.upcomingTotal > 0) {
    alerts.push(alert("CARD_OBLIGATION_UPCOMING", "INFO", "Existe obrigação de cartão no horizonte próximo", "CREDIT_CARD_BILL"));
  }
  if (loanDataStatus === "SEM_REGISTROS") {
    alerts.push(alert("LOAN_DATA_UNAVAILABLE", "INFO", "Nenhum empréstimo Pluggy foi observado", "LOAN"));
  } else if (loanDataStatus === "INCOMPLETA") {
    alerts.push(alert("LOAN_DATA_INCOMPLETE", "MEDIUM", "Há empréstimo sem saldo, parcela ou vencimento completos", "LOAN"));
  }
  if (debtServiceToIncome !== null && debtServiceToIncome >= 0.3) {
    alerts.push(alert("DEBT_SERVICE_PRESSURE", "MEDIUM", "As parcelas conhecidas representam pelo menos 30% das entradas observadas", "LOAN"));
  }

  const healthStatus: FinancialHealthStatus = loanDataStatus !== "DISPONIVEL"
    ? "INCOMPLETA"
    : alerts.some((item) => item.severity === "HIGH" || item.severity === "MEDIUM") ? "ATENCAO" : "ESTAVEL";

  return {
    source: "PLUGGY" as const,
    generatedAt: now.toISOString(),
    healthStatus,
    financial: input.financial,
    loans: {
      dataStatus: loanDataStatus,
      items: loans,
      totalOutstanding,
      totalInstallment,
      nextDueDate: nextDueDate?.toISOString() ?? null,
    },
    indicators: {
      knownDebt,
      debtServiceToIncome,
      maxCardUtilization,
      cashAfterUpcomingObligations: input.financial.obligations.cashAfterUpcoming,
      cashFlowNet: currentMonthCashFlow.net,
    },
    alerts,
  };
}
