/**
 * Re-export shared formatters.
 *
 * Kept as a thin re-export so existing imports in route files
 * (import { formatCurrency } from "@/lib/formatters") continue
 * to work without modification.
 */
export {
  formatCurrency,
  formatSignedCurrency,
  formatPercentage,
  formatDate,
  formatDateTime,
} from "@paridade-risco/shared";
