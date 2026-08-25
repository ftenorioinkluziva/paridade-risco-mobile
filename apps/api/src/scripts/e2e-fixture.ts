import bcrypt from "bcryptjs";
import { createLocalAccountIssuer } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray, like } from "drizzle-orm";

import { closeDb, db } from "@/db/client";
import {
  accounts,
  assets,
  basketAllocations,
  baskets,
  historicalPrices,
  liveQuotes,
  pluggyAccounts,
  pluggyConnections,
  pluggyInvestmentMappings,
  pluggyInvestments,
  pluggySyncRuns,
  portfolios,
  userPluggyCredentials,
  users,
} from "@/db/schema";

type FixtureCommand = "setup" | "cleanup" | "verify-clean" | "scenario";
type PluggyScenario = "buy" | "sell" | "balanced" | "stale" | "unavailable" | "pending";

const command = process.argv[2] as FixtureCommand | undefined;
const scenario = process.argv[3] as PluggyScenario | undefined;
const namespace = process.env.E2E_NAMESPACE ?? "";
const email = process.env.E2E_USER_EMAIL ?? "";
const password = process.env.E2E_USER_PASSWORD ?? "";
const fixtureAssets = [
  { ticker: "B5P211", sourceTicker: "B5P211.SA", name: "ETF Tesouro IPCA Curto" },
  { ticker: "BOVA11", sourceTicker: "BOVA11.SA", name: "ETF Ibovespa" },
  { ticker: "DOLA11", sourceTicker: "DOLA11.SA", name: "ETF Dólar" },
  { ticker: "FIXA11", sourceTicker: "FIXA11.SA", name: "ETF Renda Fixa" },
  { ticker: "IB5M11", sourceTicker: "IB5M11.SA", name: "ETF IMA-B 5+" },
  { ticker: "IMAB11", sourceTicker: "IMAB11.SA", name: "ETF IMA-B" },
  { ticker: "IRFM11", sourceTicker: "IRFM11.SA", name: "ETF IRF-M" },
  { ticker: "LFTS11", sourceTicker: "LFTS11.SA", name: "ETF Tesouro Selic" },
  { ticker: "XFIX11", sourceTicker: "XFIX11.SA", name: "ETF Fundos Imobiliários" },
];

function fixtureAssetId(ticker: string) {
  return `e2e-asset-${namespace}-${ticker}`;
}

function validateEnvironment() {
  if (command !== "setup" && command !== "cleanup" && command !== "verify-clean" && command !== "scenario") {
    throw new Error("Usage: npm run e2e:fixture -- setup|cleanup|verify-clean|scenario <name>");
  }
  if (!/^[a-z0-9-]{6,48}$/.test(namespace)) {
    throw new Error("E2E_NAMESPACE must be a lowercase, isolated namespace");
  }
  if (email !== `e2e+${namespace}@paridaderisco.invalid`) {
    throw new Error("E2E_USER_EMAIL must match the isolated namespace");
  }
  if (password.length < 20) {
    throw new Error("E2E_USER_PASSWORD must contain at least 20 characters");
  }
  if (command === "scenario" && !["buy", "sell", "balanced", "stale", "unavailable", "pending"].includes(scenario ?? "")) {
    throw new Error("E2E scenario must be buy, sell, balanced, stale, unavailable or pending");
  }
}

async function setupPluggyScenario(selectedScenario: PluggyScenario) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, selectedBasketId: true },
  });
  if (!user?.selectedBasketId) throw new Error("E2E user and active basket must exist before loading a Pluggy scenario");

  await db.delete(userPluggyCredentials).where(eq(userPluggyCredentials.userId, user.id));
  await db.delete(pluggyConnections).where(eq(pluggyConnections.userId, user.id));

  const connectionId = `e2e-pluggy-connection-${namespace}`;
  const itemId = `e2e-${selectedScenario}`;
  const now = new Date();
  const observedAt = selectedScenario === "stale"
    ? new Date(now.getTime() - 45 * 60_000)
    : now;
  await db.insert(pluggyConnections).values({
    id: connectionId,
    userId: user.id,
    itemId,
    environment: "sandbox",
    connectorName: "E2E Bank",
    status: "UPDATED",
    lastSyncAt: selectedScenario === "unavailable" ? null : observedAt,
    lastSyncStatus: selectedScenario === "unavailable" ? null : "SUCCEEDED",
  });

  const allocations = await db.query.basketAllocations.findMany({
    where: eq(basketAllocations.basketId, user.selectedBasketId),
    with: { asset: { columns: { id: true, ticker: true, name: true } } },
  });
  const totalValue = 10_000;
  const strategicValue = allocations.reduce((sum, allocation) => sum + Number(allocation.targetPercentage) * 100, 0);
  const cashBalance = selectedScenario === "balanced" ? totalValue - strategicValue
    : selectedScenario === "buy" ? 9_900
      : selectedScenario === "sell" ? 910
        : 0;
  await db.insert(pluggyAccounts).values({
    id: `e2e-pluggy-account-${namespace}`,
    connectionId,
    userId: user.id,
    sourceAccountId: `e2e-account-${selectedScenario}`,
    type: "BANK",
    subtype: "CHECKING_ACCOUNT",
    name: "Conta E2E",
    balance: cashBalance.toFixed(4),
    rawData: { fixture: true, scenario: selectedScenario },
    observedAt,
  });

  const investmentInputs = selectedScenario === "pending"
    ? [{ asset: null, ticker: "SEM-MAPA", name: "Posição sem mapeamento", value: 1_000 }]
    : allocations.map((allocation) => {
      const price = 100 + fixtureAssets.findIndex((asset) => asset.ticker === allocation.asset.ticker);
      const value = selectedScenario === "balanced"
        ? Number(allocation.targetPercentage) * 100
        : allocation.asset.ticker === "BOVA11"
          ? selectedScenario === "sell" ? 9_090 : 100
          : 0;
      return { asset: allocation.asset, ticker: allocation.asset.ticker, name: allocation.asset.name, value, price };
    }).filter((investment) => investment.value > 0);

  for (const [index, investment] of investmentInputs.entries()) {
    const investmentId = `e2e-pluggy-investment-${namespace}-${index}`;
    const price = "price" in investment ? investment.price : 100;
    await db.insert(pluggyInvestments).values({
      id: investmentId,
      connectionId,
      userId: user.id,
      sourceInvestmentId: `${itemId}-investment-${index}`,
      code: investment.ticker,
      name: investment.name,
      type: "EQUITY",
      quantity: (investment.value / price).toFixed(8),
      balance: investment.value.toFixed(4),
      amountOriginal: investment.value.toFixed(4),
      currencyCode: "BRL",
      status: "ACTIVE",
      rawData: { fixture: true, scenario: selectedScenario },
      observedAt,
    });
    if (investment.asset) {
      await db.insert(pluggyInvestmentMappings).values({
        id: `e2e-pluggy-mapping-${namespace}-${index}`,
        userId: user.id,
        pluggyInvestmentId: investmentId,
        assetId: investment.asset.id,
        status: "MAPEADO",
      });
    }
  }

  if (selectedScenario !== "unavailable") {
    await db.insert(pluggySyncRuns).values({
      id: `e2e-pluggy-sync-${namespace}`,
      connectionId,
      userId: user.id,
      status: "SUCCEEDED",
      startedAt: observedAt,
      finishedAt: observedAt,
      counts: { fixture: true, scenario: selectedScenario },
    });
  }
  console.log(`[e2e-fixture] Pluggy scenario ${selectedScenario} ready`);
}

async function cleanup() {
  await db.delete(users).where(like(users.email, `e2e+${namespace}%@paridaderisco.invalid`));
  await db.delete(assets).where(inArray(
    assets.id,
    fixtureAssets.map((asset) => fixtureAssetId(asset.ticker)),
  ));
  console.log(`[e2e-fixture] namespace ${namespace} cleaned`);
}

async function setup() {
  await cleanup();

  const userId = `e2e-user-${namespace}`;
  const basketId = `e2e-basket-${namespace}`;
  const passwordHash = await bcrypt.hash(password, 12);
  const credentialPassword = await hashPassword(password);

  const insertCredentialUser = async (user: {
    id: string;
    name: string;
    email: string;
    withProfile?: boolean;
  }) => {
    await db.insert(users).values({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: true,
      phone: user.withProfile ? "+5511999999999" : null,
      birthDate: user.withProfile ? new Date("1990-01-15T12:00:00.000Z") : null,
      passwordHash,
      role: "user",
      isActive: true,
    });

    await db.insert(accounts).values({
      id: `e2e-account-${user.id}`,
      issuer: createLocalAccountIssuer("credential"),
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: credentialPassword,
    });
  };

  await insertCredentialUser({
    id: userId,
    name: `E2E ${namespace}`,
    email,
    withProfile: true,
  });
  for (const project of ["chromium-desktop", "chromium-mobile"]) {
    await insertCredentialUser({
      id: `e2e-user-${namespace}-auth-${project}`,
      name: `E2E Auth ${project}`,
      email: `e2e+${namespace}-auth-${project}@paridaderisco.invalid`,
    });
  }

  for (const asset of fixtureAssets) {
    await db.insert(assets).values({
      id: fixtureAssetId(asset.ticker),
      ...asset,
      type: "ETF",
      calculationType: "PRECO",
      isActive: true,
    }).onConflictDoNothing({ target: assets.ticker });
  }

  const ownedAssets = await db.query.assets.findMany({
    where: (asset, { inArray }) => inArray(asset.ticker, fixtureAssets.map((item) => item.ticker)),
    columns: { id: true, ticker: true },
  });
  const assetIds = new Map(ownedAssets.map((asset) => [asset.ticker, asset.id]));
  if (assetIds.size !== fixtureAssets.length) throw new Error("E2E strategic assets were not created");

  const observedAt = new Date();
  const previousPriceAt = new Date(observedAt.getTime() - 24 * 60 * 60 * 1000);
  for (const [index, asset] of fixtureAssets.entries()) {
    const assetId = assetIds.get(asset.ticker);
    if (!assetId) throw new Error(`E2E asset missing: ${asset.ticker}`);
    const price = 100 + index;

    await db.insert(historicalPrices).values([
      {
        id: `e2e-price-previous-${namespace}-${asset.ticker}`,
        assetId,
        priceDate: previousPriceAt,
        price: (price - 1).toFixed(4),
      },
      {
        id: `e2e-price-current-${namespace}-${asset.ticker}`,
        assetId,
        priceDate: observedAt,
        price: price.toFixed(4),
      },
    ]);
    await db.insert(liveQuotes).values({
      id: `e2e-live-quote-${namespace}-${asset.ticker}`,
      assetId,
      source: "BRAPI",
      topic: asset.ticker,
      last: price.toFixed(8),
      rawData: { observedAt: observedAt.toISOString(), changePercent: 1 },
      receivedAt: observedAt,
    });
  }

  await db.insert(baskets).values({
    id: basketId,
    userId,
    name: `E2E ${namespace} — Carteira válida`,
    description: "Fixture isolada para smoke E2E",
    status: "ATIVA",
  });
  await db.insert(basketAllocations).values(fixtureAssets.map((asset, index) => ({
    basketId,
    assetId: assetIds.get(asset.ticker)!,
    targetPercentage: index === fixtureAssets.length - 1 ? "9.10" : "9.09",
    sortOrder: index,
  })));
  await db.insert(portfolios).values({
    id: `e2e-portfolio-${namespace}`,
    userId,
    cashBalance: "10000.00",
  });
  await db.update(users)
    .set({ selectedBasketId: basketId })
    .where(and(eq(users.id, userId), eq(users.email, email)));

  console.log(`[e2e-fixture] namespace ${namespace} ready`);
}

async function verifyClean() {
  const [remainingUsers, remainingAssets] = await Promise.all([
    db.query.users.findMany({
      where: like(users.email, `e2e+${namespace}%@paridaderisco.invalid`),
      columns: { id: true },
    }),
    db.query.assets.findMany({
      where: inArray(assets.id, fixtureAssets.map((asset) => fixtureAssetId(asset.ticker))),
      columns: { id: true },
    }),
  ]);

  if (remainingUsers.length > 0 || remainingAssets.length > 0) {
    throw new Error(`E2E cleanup incomplete: users=${remainingUsers.length} assets=${remainingAssets.length}`);
  }
  console.log(`[e2e-fixture] namespace ${namespace} cleanup verified`);
}

async function main() {
  validateEnvironment();
  if (command === "setup") await setup();
  else if (command === "cleanup") await cleanup();
  else if (command === "verify-clean") await verifyClean();
  else await setupPluggyScenario(scenario!);
}

main()
  .catch((error) => {
    console.error("[e2e-fixture] failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
