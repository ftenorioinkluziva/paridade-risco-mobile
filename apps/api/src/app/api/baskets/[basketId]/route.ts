import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { updateBasketSchema } from "@paridade-risco/shared";

import { db } from "@/db/client";
import { assets, basketAllocations, baskets, users } from "@/db/schema";
import { resolveUserId } from "@/lib/session";

type Params = {
  params: Promise<{ basketId: string }>;
};

export async function GET(request: Request, context: Params) {
  const userId = await resolveUserId(request);
  const { basketId } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 404 });
  }

  const basket = await db.query.baskets.findFirst({
    where: and(eq(baskets.id, basketId), eq(baskets.userId, userId)),
    with: {
      allocations: {
        with: {
          asset: {
            columns: {
              ticker: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!basket) {
    return NextResponse.json({ error: "Basket not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: basket.id,
    name: basket.name,
    status: basket.status,
    description: basket.description,
    allocations: basket.allocations.map((allocation) => ({
      id: `${allocation.basketId}-${allocation.asset.ticker}`,
      ticker: allocation.asset.ticker,
      name: allocation.asset.name,
      targetPercentage: Number(allocation.targetPercentage),
    })),
  });
}

export async function PUT(request: Request, context: Params) {
  const userId = await resolveUserId(request);
  const { basketId } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateBasketSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const total = parsed.data.allocations.reduce((sum, item) => sum + item.targetPercentage, 0);

  if (Math.abs(total - 100) > 0.01) {
    return NextResponse.json({ error: "Allocations must sum to 100" }, { status: 400 });
  }

  const basket = await db.query.baskets.findFirst({
    where: and(eq(baskets.id, basketId), eq(baskets.userId, userId)),
    columns: { id: true },
  });

  if (!basket) {
    return NextResponse.json({ error: "Basket not found" }, { status: 404 });
  }

  const requestedTickers = parsed.data.allocations.map((allocation) => allocation.assetTicker);
  const assetRows = await db.query.assets.findMany({
    where: inArray(assets.ticker, requestedTickers),
    columns: {
      id: true,
      ticker: true,
    },
  });

  if (assetRows.length !== requestedTickers.length) {
    return NextResponse.json({ error: "One or more assets were not found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    await tx.update(baskets).set({ name: parsed.data.name }).where(eq(baskets.id, basketId));
    await tx.delete(basketAllocations).where(eq(basketAllocations.basketId, basketId));
    await tx.insert(basketAllocations).values(
      parsed.data.allocations.map((allocation, index) => ({
        basketId,
        assetId: assetRows.find((asset) => asset.ticker === allocation.assetTicker)?.id ?? "",
        targetPercentage: allocation.targetPercentage.toString(),
        sortOrder: index,
      })),
    );
  });

  return GET(request, context);
}

export async function DELETE(request: Request, context: Params) {
  const userId = await resolveUserId(request);
  const { basketId } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 404 });
  }

  const basket = await db.query.baskets.findFirst({
    where: and(eq(baskets.id, basketId), eq(baskets.userId, userId)),
    columns: { id: true },
  });

  if (!basket) {
    return NextResponse.json({ error: "Basket not found" }, { status: 404 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { selectedBasketId: true },
  });

  await db.transaction(async (tx) => {
    if (user?.selectedBasketId === basketId) {
      await tx.update(users).set({ selectedBasketId: null }).where(eq(users.id, userId));
    }

    await tx.delete(baskets).where(eq(baskets.id, basketId));
  });

  return new NextResponse(null, { status: 204 });
}
