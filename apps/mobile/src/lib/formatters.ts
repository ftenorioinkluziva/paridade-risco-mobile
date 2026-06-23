/**
 * Re-export shared formatters.
 *
 * Kept as a thin re-export so existing imports in mobile screens
 * (import { formatCurrency } from "../lib/formatters") continue
 * to work without modification.
 */
export {
  formatCurrency,
  formatSignedCurrency,
  formatPercentage,
} from "@paridade-risco/shared";
