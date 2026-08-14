import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { pluggyInvestmentMappings } from "@/db/schema";
import { resolveUserId } from "@/lib/session";

type Params = {
  params: Promise<{ investmentId: string }>;
};

export async function DELETE(request: Request, context: Params) {
  const userId = await resolveUserId(request);
  const { investmentId } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 401 });
  }

  await db.delete(pluggyInvestmentMappings).where(and(
    eq(pluggyInvestmentMappings.userId, userId),
    eq(pluggyInvestmentMappings.pluggyInvestmentId, investmentId),
  ));

  return new NextResponse(null, { status: 204 });
}
