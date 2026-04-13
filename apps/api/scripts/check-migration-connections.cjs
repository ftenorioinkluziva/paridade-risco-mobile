require("dotenv").config();

const postgres = require("postgres");

async function check(name, url, table) {
  const sql = postgres(url, { connect_timeout: 8, max: 1 });

  try {
    const rows = await sql.unsafe(`select count(*)::text as count from ${table}`);
    console.log(`${name}: ok (${rows[0].count})`);
  } finally {
    await sql.end();
  }
}

async function main() {
  await check("legacy", process.env.LEGACY_DATABASE_URL, '"User"');
  await check("v2", process.env.DATABASE_URL, "users");
}

main().catch((error) => {
  console.error("connection-check-failed:", error.code || error.message);
  process.exit(1);
});
