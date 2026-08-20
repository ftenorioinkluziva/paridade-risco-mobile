import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgresql://paridade:paridade@localhost:5432/paridade";

const queryClient = postgres(connectionString, {
  max: 1,
});

export const db = drizzle(queryClient, { schema });

export async function closeDb() {
  await queryClient.end();
}
