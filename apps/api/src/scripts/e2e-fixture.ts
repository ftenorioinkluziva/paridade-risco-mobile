import bcrypt from "bcryptjs";
import { createLocalAccountIssuer } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray } from "drizzle-orm";

import { closeDb, db } from "@/db/client";
import {
  accounts,
  assets,
  basketAllocations,
  baskets,
  portfolios,
  users,
} from "@/db/schema";

type FixtureCommand = "setup" | "cleanup";

const command = process.argv[2] as FixtureCommand | undefined;
const namespace = process.env.E2E_NAMESPACE ?? "";
const email = process.env.E2E_USER_EMAIL ?? "";
const password = process.env.E2E_USER_PASSWORD ?? "";
const fixtureAssets = [
  { ticker: "BOVA11", sourceTicker: "BOVA11.SA", name: "ETF Ibovespa" },
  { ticker: "IMAB11", sourceTicker: "IMAB11.SA", name: "ETF IMA-B" },
];

function fixtureAssetId(ticker: string) {
  return `e2e-asset-${namespace}-${ticker}`;
}

function validateEnvironment() {
  if (command !== "setup" && command !== "cleanup") {
    throw new Error("Usage: npm run e2e:fixture -- setup|cleanup");
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
  await db.delete(users).where(eq(users.email, email));
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

  await db.insert(users).values({
    id: userId,
    name: `E2E ${namespace}`,
    email,
    emailVerified: true,
    phone: "+5511999999999",
    birthDate: new Date("1990-01-15T12:00:00.000Z"),
    passwordHash,
    role: "user",
    isActive: true,
  });

  await db.insert(accounts).values({
    id: `e2e-account-${namespace}`,
    issuer: createLocalAccountIssuer("credential"),
    accountId: userId,
    providerId: "credential",
    userId,
    password: credentialPassword,
  });

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
  const bovaId = assetIds.get("BOVA11");
  const imabId = assetIds.get("IMAB11");
  if (!bovaId || !imabId) throw new Error("E2E strategic assets were not created");

  await db.insert(baskets).values({
    id: basketId,
    userId,
    name: `E2E ${namespace} — Carteira válida`,
    description: "Fixture isolada para smoke E2E",
    status: "ATIVA",
  });
  await db.insert(basketAllocations).values([
    { basketId, assetId: bovaId, targetPercentage: "50", sortOrder: 0 },
    { basketId, assetId: imabId, targetPercentage: "50", sortOrder: 1 },
  ]);
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

async function main() {
  validateEnvironment();
  if (command === "setup") await setup();
  else await cleanup();
}

main()
  .catch((error) => {
    console.error("[e2e-fixture] failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
