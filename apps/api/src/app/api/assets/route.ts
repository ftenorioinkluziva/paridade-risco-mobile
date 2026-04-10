import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { assets } from "@/db/schema";

export async function GET() {
  const rows = await db.query.assets.findMany({
    where: eq(assets.isActive, true),
    columns: {
      id: true,
      ticker: true,
      name: true,
    },
    orderBy: [asc(assets.ticker)],
  });

  return NextResponse.json(rows);
}
