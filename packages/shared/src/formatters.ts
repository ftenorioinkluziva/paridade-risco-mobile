/**
 * Format a number as BRL currency.
 * Uses Intl.NumberFormat for consistent behaviour across platforms.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a value with explicit +/- sign and BRL currency.
 * Example: +R$ 1.234,56  or  -R$ 567,89
 */
export function formatSignedCurrency(value: number): string {
  const formatted = formatCurrency(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/**
 * Format a decimal as a signed percentage with 2 decimal places.
 * Example: +12,34%  or  -5,67%
 */
export function formatPercentage(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  const formatted = Math.abs(value).toFixed(2).replace(".", ",");
  return `${prefix}${formatted}%`;
}

/**
 * Format an ISO date string to Brazilian short date (dd/MM/yyyy).
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

/**
 * Format an ISO date string to Brazilian date+time (dd/MM/yyyy HH:mm).
 */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("pt-BR");
}