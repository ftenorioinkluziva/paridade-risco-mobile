import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { investmentFunds } from "@/db/schema";
import { resolveUserId } from "@/lib/session";
import { executeIdempotentWrite } from "@/lib/idempotency";

const createFundSchema = z.object({
  currentValue: z.number().nonnegative(),
  indexAssetId: z.string().optional().nullable(),
  initialInvestment: z.number().nonnegative(),
  investmentDate: z.string().min(1),
  name: z.string().min(1).max(120),
});

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.query.investmentFunds.findMany({
    where: eq(investmentFunds.userId, userId),
    orderBy: [asc(investmentFunds.investmentDate)],
    with: {
      indexAsset: {
        columns: {
          name: true,
          ticker: true,
        },
      },
    },
  });

  return NextResponse.json(
    rows.map((row) => ({
      currentValue: Number(row.currentValue),
      id: row.id,
      indexAssetName: row.indexAsset?.name ?? null,
      indexAssetTicker: row.indexAsset?.ticker ?? null,
      initialInvestment: Number(row.initialInvestment),
      investmentDate: row.investmentDate.toISOString(),
      name: row.name,
      updatedAt: row.updatedAt.toISOString(),
    })),
  );
}

export async function POST(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createFundSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return executeIdempotentWrite({ request, userId, operation: "funds.create", payload: parsed.data, write: async (tx) => {
    const [fund] = await tx
    .insert(investmentFunds)
    .values({
      currentValue: parsed.data.currentValue.toString(),
      indexAssetId: parsed.data.indexAssetId ?? null,
      initialInvestment: parsed.data.initialInvestment.toString(),
      investmentDate: new Date(parsed.data.investmentDate),
      name: parsed.data.name,
      userId,
    })
    .returning({
      currentValue: investmentFunds.currentValue,
      id: investmentFunds.id,
      indexAssetId: investmentFunds.indexAssetId,
      initialInvestment: investmentFunds.initialInvestment,
      investmentDate: investmentFunds.investmentDate,
      name: investmentFunds.name,
    });

    return { body: {
      currentValue: Number(fund.currentValue), id: fund.id, indexAssetId: fund.indexAssetId,
      initialInvestment: Number(fund.initialInvestment), investmentDate: fund.investmentDate.toISOString(), name: fund.name,
    }, status: 200 };
  }});
}
