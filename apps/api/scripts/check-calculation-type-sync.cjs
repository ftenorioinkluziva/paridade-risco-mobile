require("dotenv").config();

const postgres = require("postgres");

async function main() {
  const v2 = postgres(process.env.DATABASE_URL, { max: 1 });
  const legacy = postgres(process.env.LEGACY_DATABASE_URL, { max: 1 });

  try {
    const v2Counts = await v2.unsafe(
      "select calculation_type, count(*)::int as count from assets group by calculation_type order by calculation_type",
    );

    const legacyCounts = await legacy.unsafe(
      "select \"calculationType\" as calculation_type, count(*)::int as count from \"Ativo\" group by \"calculationType\" order by \"calculationType\"",
    );

    console.log(
      JSON.stringify(
        {
          legacyCounts,
          v2Counts,
        },
        null,
        2,
      ),
    );
  } finally {
    await legacy.end();
    await v2.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
