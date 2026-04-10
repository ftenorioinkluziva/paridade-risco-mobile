import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { baskets, users } from "@/db/schema";
import { resolveUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json([]);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      selectedBasketId: true,
    },
  });

  const rows = await db.query.baskets.findMany({
    where: eq(baskets.userId, userId),
    with: {
      allocations: {
        columns: {
          basketId: true,
        },
      },
    },
    orderBy: [asc(baskets.name)],
  });

  return NextResponse.json(
    rows.map((basket) => ({
      id: basket.id,
      name: basket.name,
      assetCount: basket.allocations.length,
      status: basket.id === user?.selectedBasketId ? "ATIVA" : basket.status,
    })),
  );
}
