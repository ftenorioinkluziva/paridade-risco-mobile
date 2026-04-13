require("dotenv").config();

const postgres = require("postgres");

async function main() {
  const legacy = postgres(process.env.LEGACY_DATABASE_URL, { connect_timeout: 8, max: 1 });
  const v2 = postgres(process.env.DATABASE_URL, { connect_timeout: 8, max: 1 });

  try {
    const [legacyHist] = await legacy`select count(*)::text as count from "DadoHistorico" where price is not null`;
    const [v2Hist] = await v2`select count(*)::text as count from historical_prices`;
    const [v2Users] = await v2`select count(*)::text as count from users`;
    const [v2Assets] = await v2`select count(*)::text as count from assets`;
    const [v2Transactions] = await v2`select count(*)::text as count from transactions`;

    console.log(JSON.stringify({
      legacyHistoricalPrices: legacyHist.count,
      v2HistoricalPrices: v2Hist.count,
      v2Users: v2Users.count,
      v2Assets: v2Assets.count,
      v2Transactions: v2Transactions.count,
    }, null, 2));
  } finally {
    await legacy.end();
    await v2.end();
  }
}

main().catch((error) => {
  console.error(error.code || error.message);
  process.exit(1);
});
