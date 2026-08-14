import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getActiveBasket } from "@/lib/portfolio";
import { getRebalanceEligibility } from "@paridade-risco/shared";
import { getPluggyPortfolioSnapshot } from "./portfolio-provider";
import { buildPluggyRebalancePreview } from "./rebalance-rules";

export async function getPluggyRebalancePreview(userId: string, input: { cashForOrders?: number } = {}) {
  const [provider, basket, profile] = await Promise.all([
    getPluggyPortfolioSnapshot(userId),
    getActiveBasket(userId),
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { birthDate: true, phone: true, role: true },
    }),
  ]);
  const eligibility = getRebalanceEligibility({
    birthDate: profile?.birthDate ?? null,
    phone: profile?.phone ?? null,
    role: profile?.role ?? "USER",
  });

  return buildPluggyRebalancePreview({
    provider,
    basket,
    eligibleForRebalance: eligibility.eligibleForRebalance,
    missingProfileFields: eligibility.missingProfileFields,
    cashForOrders: input.cashForOrders,
  });
}
