import bcrypt from "bcryptjs";
import { db } from "@/db/client";
import { users } from "@/db/schema";

async function seed() {
  const email = "test@paridaderisco.com";
  const existing = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });

  if (existing) {
    console.log("User already exists:", existing.id);
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 12);

  const [user] = await db
    .insert(users)
    .values({
      name: "Test User",
      email,
      passwordHash,
      role: "USER",
      isActive: true,
    })
    .returning();

  console.log("User created:", user.id);
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
