import "dotenv/config";

import postgres from "postgres";

type CountRow = { count: string };
type LegacyUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  password: string;
  image: string | null;
  role: "ADMIN" | "USER" | null;
  dataNascimento: string | null;
  selectedBasketId: string | null;
  createdAt: string;
  updatedAt: string;
};
type LegacyAssetRow = {
  id: string;
  ticker: string;
  name: string;
  type: string;
  calculationType?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
type LegacyPortfolioRow = {
  id: string;
  userId: string;
  cashBalance: string;
};
type LegacyBasketRow = {
  id: string;
  name: string;
  userId: string;
};
type LegacyAllocationRow = {
  cestaId: string;
  ativoId: string;
  targetPercentage: string;
};
type LegacyTransactionRow = {
  id: string;
  userId: string;
  ativoId: string;
  type: "COMPRA" | "VENDA";
  shares: string;
  pricePerShare: string;
  date: string;
};
type LegacyPriceRow = {
  id: string;
  ativoId: string;
  date: string;
  price: string | null;
};
type LegacyFundRow = {
  id: string;
  name: string;
  initialInvestment: string;
  currentValue: string;
  investmentDate: string;
  userId: string;
  indiceId: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizeAssetType(type: string) {
  const normalized = type.trim().toUpperCase();

  if (normalized.includes("ETF")) return "ETF";
  if (normalized.includes("FIXA") || normalized.includes("TESOURO") || normalized.includes("CDI") || normalized.includes("IPCA")) {
    return "RENDA_FIXA";
  }
  if (normalized.includes("CRYPTO") || normalized.includes("CRIPTO") || normalized.includes("BTC") || normalized.includes("HASH")) {
    return "CRYPTO";
  }
  if (normalized.includes("GOLD") || normalized.includes("OURO") || normalized.includes("COMMOD")) {
    return "COMMODITY";
  }
  if (normalized.includes("CASH") || normalized.includes("CAIXA")) {
    return "CAIXA";
  }

  return "OUTRO";
}

function normalizeAssetCalculationType(calculationType: string | null | undefined) {
  const normalized = calculationType?.trim().toUpperCase();

  if (normalized === "PERCENTUAL") {
    return "PERCENTUAL";
  }

  return "PRECO";
}

async function logCounts(label: string, client: postgres.Sql) {
  const [users, assets, portfolios, baskets, allocations, transactions, prices] = await Promise.all([
    client<CountRow[]>`select count(*)::text as count from users`,
    client<CountRow[]>`select count(*)::text as count from assets`,
    client<CountRow[]>`select count(*)::text as count from portfolios`,
    client<CountRow[]>`select count(*)::text as count from baskets`,
    client<CountRow[]>`select count(*)::text as count from basket_allocations`,
    client<CountRow[]>`select count(*)::text as count from transactions`,
    client<CountRow[]>`select count(*)::text as count from historical_prices`,
  ]);

  console.log(label, {
    users: users[0]?.count ?? "0",
    assets: assets[0]?.count ?? "0",
    portfolios: portfolios[0]?.count ?? "0",
    baskets: baskets[0]?.count ?? "0",
    allocations: allocations[0]?.count ?? "0",
    transactions: transactions[0]?.count ?? "0",
    prices: prices[0]?.count ?? "0",
  });
}

async function migrateUsers(legacy: postgres.Sql, v2: postgres.Sql) {
  const rows = await legacy<LegacyUserRow[]>`
    select id, name, email, phone, password, image, role, "dataNascimento", "selectedBasketId", "createdAt", "updatedAt"
    from "User"
  `;

  for (const row of rows) {
    await v2`
      insert into users (id, name, email, phone, password_hash, image, role, birth_date, is_active, selected_basket_id, created_at, updated_at)
      values (${row.id}, ${row.name}, ${row.email}, ${row.phone}, ${row.password}, ${row.image}, ${row.role ?? "USER"}, ${row.dataNascimento}, true, null, ${row.createdAt}, ${row.updatedAt})
      on conflict (id) do update
      set name = excluded.name,
          email = excluded.email,
          phone = excluded.phone,
          password_hash = excluded.password_hash,
          image = excluded.image,
          role = excluded.role,
          birth_date = excluded.birth_date,
          is_active = excluded.is_active,
          updated_at = excluded.updated_at
    `;
  }

  console.log(`Migrated users: ${rows.length}`);
}

async function migrateInvestmentFunds(legacy: postgres.Sql, v2: postgres.Sql) {
  const rows = await legacy<LegacyFundRow[]>`
    select id, name, "initialInvestment", "currentValue", "investmentDate", "userId", "indiceId", "createdAt", "updatedAt"
    from "FundoInvestimento"
  `;

  for (const row of rows) {
    await v2`
      insert into investment_funds (id, name, initial_investment, current_value, investment_date, user_id, index_asset_id, created_at, updated_at)
      values (${row.id}, ${row.name}, ${row.initialInvestment}, ${row.currentValue}, ${row.investmentDate}, ${row.userId}, ${row.indiceId}, ${row.createdAt}, ${row.updatedAt})
      on conflict (id) do update
      set name = excluded.name,
          initial_investment = excluded.initial_investment,
          current_value = excluded.current_value,
          investment_date = excluded.investment_date,
          user_id = excluded.user_id,
          index_asset_id = excluded.index_asset_id,
          updated_at = excluded.updated_at
    `;
  }

  console.log(`Migrated investment funds: ${rows.length}`);
}

async function migrateAssets(legacy: postgres.Sql, v2: postgres.Sql) {
  const rows = await legacy<LegacyAssetRow[]>`
    select id, ticker, name, type, "calculationType"
    from "Ativo"
  `;

  for (const row of rows) {
    await v2`
      insert into assets (id, ticker, name, type, calculation_type, is_active)
      values (${row.id}, ${row.ticker}, ${row.name}, ${normalizeAssetType(row.type)}, ${normalizeAssetCalculationType(row.calculationType)}, true)
      on conflict (id) do update
      set ticker = excluded.ticker,
          name = excluded.name,
          type = excluded.type,
          calculation_type = excluded.calculation_type,
          is_active = excluded.is_active
    `;
  }

  console.log(`Migrated assets: ${rows.length}`);
}

async function migratePortfolios(legacy: postgres.Sql, v2: postgres.Sql) {
  const rows = await legacy<LegacyPortfolioRow[]>`
    select id, "userId", "cashBalance"
    from "Portfolio"
  `;

  for (const row of rows) {
    await v2`
      insert into portfolios (id, user_id, cash_balance)
      values (${row.id}, ${row.userId}, ${row.cashBalance})
      on conflict (id) do update
      set user_id = excluded.user_id,
          cash_balance = excluded.cash_balance
    `;
  }

  console.log(`Migrated portfolios: ${rows.length}`);
}

async function migrateBaskets(legacy: postgres.Sql, v2: postgres.Sql) {
  const rows = await legacy<LegacyBasketRow[]>`
    select id, name, "userId"
    from "Cesta"
  `;

  for (const row of rows) {
    await v2`
      insert into baskets (id, user_id, name, description, status)
      values (${row.id}, ${row.userId}, ${row.name}, '', 'RASCUNHO')
      on conflict (id) do update
      set user_id = excluded.user_id,
          name = excluded.name,
          description = excluded.description,
          status = excluded.status
    `;
  }

  console.log(`Migrated baskets: ${rows.length}`);
}

async function migrateAllocations(legacy: postgres.Sql, v2: postgres.Sql) {
  const rows = await legacy<LegacyAllocationRow[]>`
    select "cestaId", "ativoId", "targetPercentage"
    from "AtivosEmCestas"
    order by "cestaId", "targetPercentage" desc
  `;

  const sortOrderByBasket = new Map<string, number>();

  for (const row of rows) {
    const nextSortOrder = sortOrderByBasket.get(row.cestaId) ?? 0;
    sortOrderByBasket.set(row.cestaId, nextSortOrder + 1);

    await v2`
      insert into basket_allocations (basket_id, asset_id, target_percentage, sort_order)
      values (${row.cestaId}, ${row.ativoId}, ${row.targetPercentage}, ${nextSortOrder})
      on conflict (basket_id, asset_id) do update
      set target_percentage = excluded.target_percentage,
          sort_order = excluded.sort_order
    `;
  }

  console.log(`Migrated basket allocations: ${rows.length}`);
}

async function migrateSelectedBasket(legacy: postgres.Sql, v2: postgres.Sql) {
  const rows = await legacy<Pick<LegacyUserRow, "id" | "selectedBasketId">[]>`
    select id, "selectedBasketId"
    from "User"
    where "selectedBasketId" is not null
  `;

  for (const row of rows) {
    await v2`
      update users
      set selected_basket_id = ${row.selectedBasketId}
      where id = ${row.id}
    `;
  }

  console.log(`Migrated selected baskets: ${rows.length}`);
}

async function migrateTransactions(legacy: postgres.Sql, v2: postgres.Sql) {
  const rows = await legacy<LegacyTransactionRow[]>`
    select id, "userId", "ativoId", type, shares, "pricePerShare", date
    from "Transacao"
  `;

  for (const row of rows) {
    await v2`
      insert into transactions (id, user_id, asset_id, type, shares, price_per_share, traded_at)
      values (${row.id}, ${row.userId}, ${row.ativoId}, ${row.type}, ${row.shares}, ${row.pricePerShare}, ${row.date})
      on conflict (id) do update
      set user_id = excluded.user_id,
          asset_id = excluded.asset_id,
          type = excluded.type,
          shares = excluded.shares,
          price_per_share = excluded.price_per_share,
          traded_at = excluded.traded_at
    `;
  }

  console.log(`Migrated transactions: ${rows.length}`);
}

async function migrateHistoricalPrices(legacy: postgres.Sql, v2: postgres.Sql) {
  const batchSize = 1000;
  let lastId: string | null = null;
  let total = 0;
  const existingRows = await v2<{ id: string }[]>`select id from historical_prices`;
  const existingIds = new Set(existingRows.map((row) => row.id));

  while (true) {
    const rows: LegacyPriceRow[] = lastId
      ? await legacy<LegacyPriceRow[]>`
          select id, "ativoId", date, price
          from "DadoHistorico"
          where price is not null and id > ${lastId}
          order by id
          limit ${batchSize}
        `
      : await legacy<LegacyPriceRow[]>`
          select id, "ativoId", date, price
          from "DadoHistorico"
          where price is not null
          order by id
          limit ${batchSize}
        `;

    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      if (existingIds.has(row.id)) {
        continue;
      }

      await v2`
        insert into historical_prices (id, asset_id, price_date, price)
        values (${row.id}, ${row.ativoId}, ${row.date}, ${row.price})
        on conflict (id) do update
        set asset_id = excluded.asset_id,
            price_date = excluded.price_date,
            price = excluded.price
      `;

      existingIds.add(row.id);
    }

    total += rows.length;
    lastId = rows[rows.length - 1]?.id ?? lastId;
    console.log(`Migrated historical prices batch, total: ${total}`);
  }

  console.log(`Migrated historical prices: ${total}`);
}

async function main() {
  const legacyUrl = process.env.LEGACY_DATABASE_URL;
  const v2Url = process.env.DATABASE_URL;

  if (!legacyUrl) {
    throw new Error("LEGACY_DATABASE_URL is not set");
  }

  if (!v2Url) {
    throw new Error("DATABASE_URL is not set");
  }

  const legacy = postgres(legacyUrl, { max: 1 });
  const v2 = postgres(v2Url, { max: 1 });
  const skipCounts = process.env.SKIP_MIGRATION_COUNTS === "true";
  const skipHistoricalPrices = process.env.SKIP_HISTORICAL_PRICES === "true";

  try {
    if (!skipCounts) {
      await logCounts("V2 before migration:", v2);
    }

    await migrateUsers(legacy, v2);
    await migrateAssets(legacy, v2);
    await migratePortfolios(legacy, v2);
    await migrateBaskets(legacy, v2);
    await migrateAllocations(legacy, v2);
    await migrateSelectedBasket(legacy, v2);
    await migrateTransactions(legacy, v2);
    await migrateInvestmentFunds(legacy, v2);

    if (!skipHistoricalPrices) {
      await migrateHistoricalPrices(legacy, v2);
    }

    if (!skipCounts) {
      await logCounts("V2 after migration:", v2);
    }
  } finally {
    await legacy.end();
    await v2.end();
  }
}

void main().catch((error) => {
  console.error("Legacy migration scaffold failed:", error);
  process.exit(1);
});
