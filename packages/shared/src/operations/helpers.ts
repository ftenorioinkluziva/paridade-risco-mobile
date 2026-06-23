/**
 * Utility: convert numeric values safely.
 */
export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (value == null) return 0;
  return Number(value);
}

/**
 * Utility: format a Date as DD/MM/YYYY for the BCB API.
 */
export function formatDateForBCB(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Utility: parse a BCB date string (DD/MM/YYYY) into a Date.
 */
export function parseBCBDate(value: string): Date {
  const [day, month, year] = value.split("/");
  return new Date(`${year}-${month}-${day}T12:00:00.000Z`);
}

/**
 * Utility: normalize a Date to UTC day start (midnight).
 */
export function toUtcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Utility: add N days to a date (UTC-safe).
 */
export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Utility: get a UTC day key string (YYYY-MM-DD) from a Date.
 */
export function toUtcDayKey(date: Date): string {
  return toUtcDayStart(date).toISOString().slice(0, 10);
}