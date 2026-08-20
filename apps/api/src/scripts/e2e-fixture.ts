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
  portfolios,
  users,
} from "@/db/schema";

type FixtureCommand = "setup" | "cleanup" | "verify-clean";

const command = process.argv[2] as FixtureCommand | undefined;
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
  { ticker: "SMAL11", sourceTicker: "SMAL11.SA", name: "ETF Small Caps" },
  { ticker: "SPXI11", sourceTicker: "SPXI11.SA", name: "ETF S&P 500" },
  { ticker: "XFIX11", sourceTicker: "XFIX11.SA", name: "ETF Fundos Imobiliários" },
];

function fixtureAssetId(ticker: string) {
  return `e2e-asset-${namespace}-${ticker}`;
}

function validateEnvironment() {
  if (command !== "setup" && command !== "cleanup" && command !== "verify-clean") {
    throw new Error("Usage: npm run e2e:fixture -- setup|cleanup|verify-clean");
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
  else await verifyClean();
}

main()
  .catch((error) => {
    console.error("[e2e-fixture] failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
