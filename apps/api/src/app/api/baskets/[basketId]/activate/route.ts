import { and, eq } from "drizzle-orm";
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let action = "activate";
  try {
    const body = await request.json();
    if (body?.action === "deactivate") action = "deactivate";
  } catch { /* no body — default activate */ }

  const basket = await db.query.baskets.findFirst({
    where: and(eq(baskets.id, basketId), eq(baskets.userId, userId)),
    columns: { id: true },
  });

  if (!basket) {
    return NextResponse.json({ error: "Basket not found" }, { status: 404 });
  }

  if (action === "deactivate") {
    await db.transaction(async (tx) => {
      await tx.update(baskets)
        .set({ status: "RASCUNHO" })
        .where(eq(baskets.id, basketId));

      const currentUser = await tx.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { selectedBasketId: true },
      });
      if (currentUser?.selectedBasketId === basketId) {
        await tx.update(users).set({ selectedBasketId: null }).where(eq(users.id, userId));
      }
    });
  } else {
    await db.transaction(async (tx) => {
      const currentUser = await tx.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { selectedBasketId: true },
      });

      if (currentUser?.selectedBasketId && currentUser.selectedBasketId !== basketId) {
        await tx.update(baskets)
          .set({ status: "RASCUNHO" })
          .where(eq(baskets.id, currentUser.selectedBasketId));
      }

      await tx.update(baskets)
        .set({ status: "ATIVA" })
        .where(eq(baskets.id, basketId));

      await tx.update(users).set({ selectedBasketId: basketId }).where(eq(users.id, userId));
    });
  }

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
