import { asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { createBasketSchema } from "@paridade-risco/shared";

import { db } from "@/db/client";
import { assets, basketAllocations, baskets, users } from "@/db/schema";
import { resolveUserId } from "@/lib/session";
import { executeIdempotentWrite } from "@/lib/idempotency";

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

export async function POST(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createBasketSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const total = parsed.data.allocations.reduce((sum: number, item) => sum + item.targetPercentage, 0);

  if (Math.abs(total - 100) > 0.01) {
    return NextResponse.json({ error: "Allocations must sum to 100" }, { status: 400 });
  }

  const requestedTickers = parsed.data.allocations.map((a) => a.assetTicker);
  const assetRows = await db.query.assets.findMany({
    where: inArray(assets.ticker, requestedTickers),
    columns: { id: true, ticker: true },
  });

  if (assetRows.length !== requestedTickers.length) {
    return NextResponse.json({ error: "One or more assets were not found" }, { status: 404 });
  }

  return executeIdempotentWrite({ request, userId, operation: "baskets.create", payload: parsed.data, write: async (tx) => {
    const [basket] = await tx
      .insert(baskets)
      .values({
        userId,
        name: parsed.data.name,
        status: "RASCUNHO",
        description: "",
      })
      .returning({ id: baskets.id });

    await tx.insert(basketAllocations).values(
      parsed.data.allocations.map((allocation, index) => ({
        basketId: basket.id,
        assetId: assetRows.find((a) => a.ticker === allocation.assetTicker)?.id ?? "",
        targetPercentage: allocation.targetPercentage.toString(),
        sortOrder: index,
      })),
    );

    const currentUser = await tx.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { selectedBasketId: true },
    });

    if (currentUser?.selectedBasketId) {
      await tx.update(baskets)
        .set({ status: "RASCUNHO" })
        .where(eq(baskets.id, currentUser.selectedBasketId));
    }

    await tx.update(baskets)
      .set({ status: "ATIVA" })
      .where(eq(baskets.id, basket.id));

    await tx.update(users).set({ selectedBasketId: basket.id }).where(eq(users.id, userId));
    return { body: { id: basket.id }, status: 201 };
  }});
}
