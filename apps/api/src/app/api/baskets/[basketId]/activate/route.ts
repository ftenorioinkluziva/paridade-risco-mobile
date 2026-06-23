import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { baskets, users } from "@/db/schema";
import { resolveUserId } from "@/lib/session";

type Params = {
  params: Promise<{ basketId: string }>;
};

export async function PATCH(request: Request, context: Params) {
  const userId = await resolveUserId(request);
  const { basketId } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 404 });
  }

  const basket = await db.query.baskets.findFirst({
    where: eq(baskets.id, basketId),
    columns: { id: true },
  });

  if (!basket) {
    return NextResponse.json({ error: "Basket not found" }, { status: 404 });
  }

  await db.update(users).set({ selectedBasketId: basketId }).where(eq(users.id, userId));

  // Re-fetch the basket to return full details
  const updatedBasket = await db.query.baskets.findFirst({
    where: eq(baskets.id, basketId),
    columns: {
      id: true,
      name: true,
      status: true,
      description: true,
    },
  });

  return NextResponse.json(updatedBasket);
}