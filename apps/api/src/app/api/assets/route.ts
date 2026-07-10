import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";

export async function GET() {
  const rows = await db.execute<{ id: string; ticker: string; name: string }>(
    sql`SELECT a.id, a.ticker, a.name
FROM assets a
WHERE a.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM assets canonical
    WHERE canonical.is_active = true
      AND canonical.source_ticker = a.ticker
  )
ORDER BY a.ticker ASC`,
  );

  return NextResponse.json(rows);
}
