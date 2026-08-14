import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { liveQuotes, pluggyAccounts, pluggyInvestments } from "@/db/schema";
import { toNumber } from "@/lib/number";

import type { PortfolioProvider, PortfolioProviderSnapshot } from "@/lib/portfolio-provider";
import { isPluggyCreditCard } from "./projection-rules";

function numericOrNull(value: string | null) {
  return value === null ? null : toNumber(value);
}

export function isPluggyCashAccount(account: { type: string | null; subtype: string | null }) {
  return account.type === "BANK" && !isPluggyCreditCard(account.type, account.subtype);
}

function latestDate(dates: Array<Date | null>) {
  return dates.reduce<Date | null>((latest, date) => {
    if (!date || (latest && latest >= date)) return latest;
    return date;
  }, null);
}

export async function getPluggyPortfolioSnapshot(userId: string): Promise<PortfolioProviderSnapshot> {
  const [investments, accounts] = await Promise.all([
    db.query.pluggyInvestments.findMany({
      where: eq(pluggyInvestments.userId, userId),
      with: {
        mapping: {
          with: {
            asset: {
              columns: { id: true, ticker: true, name: true, type: true },
            },
          },
        },
      },
      orderBy: [desc(pluggyInvestments.observedAt)],
    }),
    db.query.pluggyAccounts.findMany({
      where: eq(pluggyAccounts.userId, userId),
      columns: { type: true, subtype: true, balance: true, observedAt: true },
    }),
  ]);
  const latestLiveQuotes = await db.query.liveQuotes.findMany({
    where: inArray(liveQuotes.source, ["BRAPI", "YAHOO_FINANCE"]),
    columns: { assetId: true, last: true, receivedAt: true },
    with: { asset: { columns: { ticker: true } } },
    orderBy: [desc(liveQuotes.receivedAt)],
  });
  const livePricesByAssetId = new Map<string, number>();
  const livePricesByTicker: Record<string, number> = {};
  for (const quote of latestLiveQuotes) {
    const price = numericOrNull(quote.last);
    const ticker = quote.asset?.ticker;
    if (price === null || !ticker || livePricesByAssetId.has(quote.assetId)) continue;
    livePricesByAssetId.set(quote.assetId, price);
    livePricesByTicker[ticker] = price;
  }

  const mappedInvestments = investments.filter((investment) => investment.mapping?.status === "MAPEADO");
  const outsideStrategyInvestments = investments.filter((investment) => investment.mapping?.status === "FORA_DA_ESTRATEGIA");
  const unresolvedInvestments = investments.filter((investment) => !investment.mapping || !["MAPEADO", "FORA_DA_ESTRATEGIA"].includes(investment.mapping.status));
  const positions = mappedInvestments.flatMap((investment) => {
    const asset = investment.mapping?.asset;
    if (!asset) return [];
    const quantity = numericOrNull(investment.quantity);
    const pluggyValue = numericOrNull(investment.balance) ?? 0;
    const livePrice = livePricesByAssetId.get(asset.id) ?? null;
    const currentValue = livePrice !== null && quantity !== null ? quantity * livePrice : pluggyValue;
    return [{
      providerPositionId: investment.id,
      assetId: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      type: asset.type,
      quantity,
      currentValue,
      costBasis: numericOrNull(investment.amountOriginal),
      observedAt: investment.observedAt,
    }];
  });
  const cashBalance = accounts
    .filter(isPluggyCashAccount)
    .reduce((sum, account) => sum + (numericOrNull(account.balance) ?? 0), 0);
  const investedValue = positions.reduce((sum, position) => sum + position.currentValue, 0);
  const outsideStrategyValue = outsideStrategyInvestments.reduce((sum, investment) => sum + (numericOrNull(investment.balance) ?? 0), 0);
  const unresolvedValue = unresolvedInvestments.reduce((sum, investment) => sum + (numericOrNull(investment.balance) ?? 0), 0);
  const missingCostBasisCount = positions.filter((position) => position.costBasis === null).length;
  const warnings: string[] = [];

  if (unresolvedInvestments.length > 0) {
    warnings.push(`${unresolvedInvestments.length} investimento(s) Pluggy aguardam decisão estratégica e não entraram nas posições`);
  }
  if (missingCostBasisCount > 0) {
    warnings.push(`${missingCostBasisCount} posição(ões) mapeada(s) não possuem custo original`);
  }
  if (investments.length === 0) {
    warnings.push("Nenhum investimento Pluggy sincronizado");
  }

  return {
    source: "PLUGGY",
    observedAt: latestDate([
      ...investments.map((investment) => investment.observedAt),
      ...accounts.map((account) => account.observedAt),
    ]),
    totalValue: investedValue + outsideStrategyValue + unresolvedValue + cashBalance,
    investedValue,
    cashBalance,
    outsideStrategyValue,
    outsideStrategyCount: outsideStrategyInvestments.length,
    unresolvedValue,
    unresolvedCount: unresolvedInvestments.length,
    positions,
    livePricesByTicker,
    warnings,
  };
}

export function createPluggyPortfolioProvider(): PortfolioProvider {
  return {
    source: "PLUGGY",
    getSnapshot: getPluggyPortfolioSnapshot,
  };
}
