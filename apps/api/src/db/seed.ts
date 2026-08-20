import bcrypt from "bcryptjs";
import { db } from "@/db/client";
import { users, assets, baskets, basketAllocations, investmentFunds, historicalPrices, portfolios, transactions } from "@/db/schema";
import { sql } from "drizzle-orm";

async function seed() {
  // ── User ────────────────────────────────────────────────────────────────
  const email = "test@paridaderisco.com";
  let userId = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
    columns: { id: true },
  });

  if (!userId) {
    const passwordHash = await bcrypt.hash("password123", 12);
    const [user] = await db.insert(users).values({
      name: "Test User",
      email,
      passwordHash,
      role: "user",
      isActive: true,
    }).returning({ id: users.id });
    userId = user;
    console.log("User created:", userId.id);
  } else {
    console.log("User already exists:", userId.id);
  }
  const uid = userId.id;

  // ── Assets ──────────────────────────────────────────────────────────────
  const assetData = [
    { ticker: "B5P211", sourceTicker: "B5P211.SA", name: "IT NOW IMA-B5 P2 ETF", type: "ETF" as const, calculationType: "PRECO" as const, isActive: true },
    { ticker: "BOVA11", sourceTicker: "BOVA11.SA", name: "ETF Ibovespa", type: "ETF" as const, calculationType: "PRECO" as const, isActive: true },
    { ticker: "DOLA11", sourceTicker: "DOLA11.SA", name: "BB ETF INDICE FUTURO DE DOLAR S&P/B3", type: "ETF" as const, calculationType: "PRECO" as const, isActive: true },
    { ticker: "FIXA11", sourceTicker: "FIXA11.SA", name: "BB ETF RENDA FIXA PRE INDICE FUTURO DE TAXAS JUROS S&P/B3", type: "ETF" as const, calculationType: "PRECO" as const, isActive: true },
    { ticker: "IB5M11", sourceTicker: "IB5M11.SA", name: "IT NOW IMA-B5+ ETF", type: "ETF" as const, calculationType: "PRECO" as const, isActive: true },
    { ticker: "IMAB11", sourceTicker: "IMAB11.SA", name: "ETF IMA-B", type: "ETF" as const, calculationType: "PRECO" as const, isActive: true },
    { ticker: "IRFM11", sourceTicker: "IRFM11.SA", name: "IT NOW IRF-M P2 ETF", type: "ETF" as const, calculationType: "PRECO" as const, isActive: true },
    { ticker: "LFTS11", sourceTicker: "LFTS11.SA", name: "INVESTO TEVA TESOURO SELIC ETF", type: "ETF" as const, calculationType: "PRECO" as const, isActive: true },
    { ticker: "SMAL11", sourceTicker: "SMAL11.SA", name: "ETF Small Caps", type: "ETF" as const, calculationType: "PRECO" as const, isActive: true },
    { ticker: "SPXI11", sourceTicker: "SPXI11.SA", name: "ETF S&P 500", type: "ETF" as const, calculationType: "PRECO" as const, isActive: true },
    { ticker: "XFIX11", sourceTicker: "XFIX11.SA", name: "Trend Ifix", type: "ETF" as const, calculationType: "PRECO" as const, isActive: true },
  ];

  const existingAssets = await db.query.assets.findMany({ columns: { ticker: true, id: true } });
  const assetMap: Record<string, string> = {};
  for (const a of existingAssets) assetMap[a.ticker] = a.id;

  const newAssets: { ticker: string; id: string }[] = [];
  for (const a of assetData) {
    if (!assetMap[a.ticker]) {
      const [created] = await db.insert(assets).values(a).returning({ ticker: assets.ticker, id: assets.id });
      newAssets.push(created);
      assetMap[created.ticker] = created.id;
    } else {
      await db.update(assets).set({ sourceTicker: a.sourceTicker ?? null, isActive: true }).where(sql`ticker = ${a.ticker}`);
    }
  }
  if (newAssets.length > 0) console.log("Assets created:", newAssets.map(a => a.ticker).join(", "));
  else console.log("All assets already exist");

  // ── Baskets (Cestas) ────────────────────────────────────────────────────
  const basketDefs = [
    {
      name: "Carteira Equilibrada",
      description: "60% Renda Variável / 40% Renda Fixa — crescimento com estabilidade",
      allocations: [
        { ticker: "BOVA11", pct: 25 }, { ticker: "SPXI11", pct: 20 },
        { ticker: "SMAL11", pct: 10 }, { ticker: "IMAB11", pct: 15 },
        { ticker: "CDB_POS", pct: 15 }, { ticker: "TESOURO_SELIC", pct: 10 },
        { ticker: "OURO", pct: 5 },
      ],
    },
    {
      name: "Carteira Conservadora",
      description: "Maior exposição à renda fixa para preservação de capital",
      allocations: [
        { ticker: "BOVA11", pct: 10 }, { ticker: "SPXI11", pct: 10 },
        { ticker: "IMAB11", pct: 20 }, { ticker: "CDB_POS", pct: 30 },
        { ticker: "TESOURO_SELIC", pct: 25 }, { ticker: "OURO", pct: 5 },
      ],
    },
    {
      name: "Carteira Agressiva",
      description: "Alta exposição a risco para maximizar retorno no longo prazo",
      allocations: [
        { ticker: "BOVA11", pct: 30 }, { ticker: "SPXI11", pct: 25 },
        { ticker: "SMAL11", pct: 15 }, { ticker: "BTC", pct: 10 },
        { ticker: "ETH", pct: 5 }, { ticker: "IMAB11", pct: 10 },
        { ticker: "TESOURO_SELIC", pct: 5 },
      ],
    },
    {
      name: "Carteira de Hedge",
      description: "Proteção contra inflação e crises com ativos reais e internacionais",
      allocations: [
        { ticker: "SPXI11", pct: 25 }, { ticker: "OURO", pct: 20 },
        { ticker: "BTC", pct: 15 }, { ticker: "IMAB11", pct: 20 },
        { ticker: "CDB_POS", pct: 10 }, { ticker: "TESOURO_SELIC", pct: 10 },
      ],
    },
  ];

  const existingBaskets = await db.query.baskets.findMany({
    where: (b, { eq }) => eq(b.userId, uid),
    columns: { name: true, id: true },
  });
  const basketMap: Record<string, string> = {};
  for (const b of existingBaskets) basketMap[b.name] = b.id;

  for (const def of basketDefs) {
    let basketId = basketMap[def.name];
    if (!basketId) {
      const [basket] = await db.insert(baskets).values({
        userId: uid, name: def.name, description: def.description, status: "RASCUNHO",
      }).returning({ id: baskets.id });
      basketId = basket.id;
      basketMap[def.name] = basketId;
      console.log("Basket created:", def.name);
    } else {
      console.log("Basket already exists:", def.name);
    }

    const existingAllocs = await db.query.basketAllocations.findMany({
      where: (ba, { eq }) => eq(ba.basketId, basketId),
      columns: { assetId: true },
    });
    const allocatedAssetIds = new Set(existingAllocs.map(a => a.assetId));

    for (let i = 0; i < def.allocations.length; i++) {
      const alloc = def.allocations[i];
      const assetId = assetMap[alloc.ticker];
      if (!assetId) {
        console.warn(`  Asset ${alloc.ticker} not found, skipping allocation`);
        continue;
      }
      if (!allocatedAssetIds.has(assetId)) {
        await db.insert(basketAllocations).values({
          basketId, assetId, targetPercentage: String(alloc.pct), sortOrder: i,
        });
      }
    }
  }

  // ── Investment Funds ────────────────────────────────────────────────────
  const fundData = [
    { name: "Fundo Multimercado", initial: "50000.00", current: "52340.80", date: "2025-06-01" },
    { name: "Fundo Renda Fixa", initial: "30000.00", current: "30980.50", date: "2025-06-15" },
    { name: "Fundo Ações", initial: "25000.00", current: "27120.30", date: "2025-07-01" },
  ];

  const existingFunds = await db.query.investmentFunds.findMany({
    where: (f, { eq }) => eq(f.userId, uid),
    columns: { name: true },
  });
  const fundNames = new Set(existingFunds.map(f => f.name));

  for (const f of fundData) {
    if (!fundNames.has(f.name)) {
      await db.insert(investmentFunds).values({
        name: f.name, userId: uid,
        initialInvestment: f.initial, currentValue: f.current,
        investmentDate: new Date(f.date),
      });
      console.log("Fund created:", f.name);
    }
  }

  // ── Historical Prices ───────────────────────────────────────────────────
  const priceAssets = ["BOVA11", "SPXI11", "IMAB11", "SMAL11", "BTC", "ETH", "OURO"];
  const currentPrices: Record<string, string> = {
    BOVA11: "128.50", SPXI11: "95.30", IMAB11: "85.20", SMAL11: "72.40",
    BTC: "385000.00", ETH: "21000.00", OURO: "450.00",
  };
  const dailyVolatility: Record<string, number> = {
    BOVA11: 0.015, SPXI11: 0.012, IMAB11: 0.005, SMAL11: 0.02,
    BTC: 0.035, ETH: 0.04, OURO: 0.008,
  };

  for (const ticker of priceAssets) {
    const assetId = assetMap[ticker];
    if (!assetId) continue;

    const existingPrices = await db.query.historicalPrices.findMany({
      where: (p, { eq }) => eq(p.assetId, assetId),
      columns: { priceDate: true },
      orderBy: (p, { desc }) => [desc(p.priceDate)],
      limit: 1,
    });

    if (existingPrices.length > 0) {
      console.log(`Prices already exist for ${ticker}, skipping`);
      continue;
    }

    const basePrice = parseFloat(currentPrices[ticker]);
    const vol = dailyVolatility[ticker];
    let price = basePrice;
    const rows: { assetId: string; priceDate: Date; price: string }[] = [];

    for (let day = 30; day >= 0; day--) {
      const date = new Date("2026-06-23");
      date.setDate(date.getDate() - day);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      const change = (Math.random() - 0.48) * vol;
      price = price * (1 + change);
      rows.push({ assetId, priceDate: date, price: price.toFixed(4) });
    }
    await db.insert(historicalPrices).values(rows);
    console.log(`Prices created for ${ticker}: ${rows.length} days`);
  }

  // ── Portfolio ───────────────────────────────────────────────────────────
  const existingPortfolio = await db.query.portfolios.findFirst({
    where: (p, { eq }) => eq(p.userId, uid),
  });
  if (!existingPortfolio) {
    await db.insert(portfolios).values({ userId: uid, cashBalance: "15000.00" });
    console.log("Portfolio created with R$ 15.000,00 cash");
  } else {
    console.log("Portfolio already exists");
  }

  // ── Transactions ────────────────────────────────────────────────────────
  const existingTx = await db.query.transactions.findFirst({
    where: (t, { eq }) => eq(t.userId, uid),
  });

  if (!existingTx) {
    const txData = [
      { ticker: "BOVA11", type: "COMPRA" as const, shares: "50", price: "125.30", daysAgo: 20 },
      { ticker: "SPXI11", type: "COMPRA" as const, shares: "30", price: "92.10", daysAgo: 18 },
      { ticker: "IMAB11", type: "COMPRA" as const, shares: "40", price: "84.50", daysAgo: 15 },
      { ticker: "SMAL11", type: "COMPRA" as const, shares: "20", price: "70.80", daysAgo: 12 },
      { ticker: "BTC", type: "COMPRA" as const, shares: "0.05", price: "380000.00", daysAgo: 10 },
      { ticker: "BOVA11", type: "COMPRA" as const, shares: "25", price: "127.00", daysAgo: 5 },
    ];

    for (const tx of txData) {
      const assetId = assetMap[tx.ticker];
      if (!assetId) continue;
      const tradedAt = new Date("2026-06-23");
      tradedAt.setDate(tradedAt.getDate() - tx.daysAgo);
      await db.insert(transactions).values({
        userId: uid, assetId, type: tx.type,
        shares: tx.shares, pricePerShare: tx.price, tradedAt,
      });
    }
    console.log(`Transactions created: ${txData.length}`);
  } else {
    console.log("Transactions already exist");
  }

  // ── Select default basket ──────────────────────────────────────────────
  const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, uid) });
  if (user && !user.selectedBasketId) {
    const firstBasket = await db.query.baskets.findFirst({
      where: (b, { eq }) => eq(b.userId, uid),
      orderBy: (b, { asc }) => [asc(b.createdAt)],
    });
    if (firstBasket) {
      await db.update(baskets).set({ status: "ATIVA" }).where(sql`id = ${firstBasket.id}`);
      await db.update(users).set({ selectedBasketId: firstBasket.id }).where(sql`id = ${uid}`);
      console.log("Default basket selected:", firstBasket.name);
    }
  }

  console.log("\n✅ Seed completed successfully!");
  console.log(`   User: test@paridaderisco.com / password123`);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
}).finally(() => process.exit(0));
