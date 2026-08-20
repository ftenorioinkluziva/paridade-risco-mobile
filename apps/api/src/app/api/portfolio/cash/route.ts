import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { portfolios } from "@/db/schema";
import { resolveUserId } from "@/lib/session";

const updateCashSchema = z.object({
  cashBalance: z.number().min(0),
});

export async function PUT(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateCashSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updatedPortfolio] = await db
    .update(portfolios)
    .set({
      cashBalance: String(parsed.data.cashBalance),
    })
    .where(eq(portfolios.userId, userId))
    .returning({
      cashBalance: portfolios.cashBalance,
      id: portfolios.id,
      userId: portfolios.userId,
    });

  if (!updatedPortfolio) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  return NextResponse.json({
    cashBalance: parseFloat(updatedPortfolio.cashBalance),
    id: updatedPortfolio.id,
    userId: updatedPortfolio.userId,
  });
}
