require("dotenv").config();

const postgres = require("postgres");

async function tableCount(sql, tableName) {
  const query = `select count(*)::int as count from "${tableName}"`;
  const rows = await sql.unsafe(query);
  return rows[0]?.count ?? 0;
}

async function main() {
  const sql = postgres(process.env.LEGACY_DATABASE_URL, { max: 1 });

  try {
    const tables = [
      "User",
      "Portfolio",
      "Cesta",
      "Ativo",
      "AtivosEmCestas",
      "DadoHistorico",
      "Transacao",
      "FundoInvestimento",
      "SimulacaoAposentadoria",
      "Resource",
      "Embedding",
      "Notification",
      "Chat",
    ];

    const result = {};

    for (const tableName of tables) {
      result[tableName] = await tableCount(sql, tableName);
    }

    const calcTypeRows = await sql.unsafe(
      "select count(*)::int as count from \"Ativo\" where \"calculationType\" is not null",
    );
    result.AtivoWithCalculationType = calcTypeRows[0]?.count ?? 0;

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
