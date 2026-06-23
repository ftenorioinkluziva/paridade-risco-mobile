/**
 * Safe numeric conversion. Delegates to @paridade-risco/shared.
 *
 * Kept as a thin re-export so existing imports in route files
 * (import { toNumber } from "@/lib/number") continue to work
 * without modification.
 */
export { toNumber } from "@paridade-risco/shared";