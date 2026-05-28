const sql = require("postgres");

async function main() {
  const pg = sql(process.env.DATABASE_URL);

  try {
    const [users, baskets] = await Promise.all([
      pg`select id, name, email, role, "selectedBasketId" from "User"`,
      pg`select id, name, "userId" from "Cesta"`,
    ]);

    console.log("=== USERS (" + users.length + ") ===");
    for (const u of users) {
      console.log(JSON.stringify({ id: u.id, name: u.name, email: u.email, role: u.role, selectedBasketId: u.selectedBasketId }));
    }

    console.log("=== CESTAS (" + baskets.length + ") ===");
    for (const b of baskets) {
      console.log(JSON.stringify({ id: b.id, name: b.name, userId: b.userId }));
    }
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await pg.end();
  }
}

main();
