import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { portfolioSourcePreferences } from "@/db/schema";
import { createManualPortfolioProvider } from "@/lib/portfolio-dual-read";
import { createPluggyPortfolioProvider } from "@/lib/pluggy/portfolio-provider";

export type ActivePortfolioSource = "MANUAL" | "PLUGGY";

export async function getPortfolioSourceMode(userId: string): Promise<ActivePortfolioSource> {
  const preference = await db.query.portfolioSourcePreferences.findFirst({
    where: eq(portfolioSourcePreferences.userId, userId),
    columns: { sourceMode: true },
  });

  return preference?.sourceMode === "PLUGGY" ? "PLUGGY" : "MANUAL";
}

export async function setPortfolioSourceMode(userId: string, sourceMode: ActivePortfolioSource) {
  const now = new Date();
  await db.insert(portfolioSourcePreferences).values({
    userId,
    sourceMode,
    approvedAt: now,
  }).onConflictDoUpdate({
    target: portfolioSourcePreferences.userId,
    set: {
      sourceMode,
      approvedAt: now,
      updatedAt: now,
    },
  });
}

export async function getActivePortfolioProvider(userId: string) {
  const sourceMode = await getPortfolioSourceMode(userId);
  return sourceMode === "PLUGGY"
    ? createPluggyPortfolioProvider()
    : createManualPortfolioProvider();
}
