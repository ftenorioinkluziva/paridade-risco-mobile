import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { investmentFunds } from "@/db/schema";
import { resolveUserId } from "@/lib/session";

const updateFundSchema = z
  .object({
    currentValue: z.number().nonnegative().optional(),
    indexAssetId: z.string().optional().nullable(),
    initialInvestment: z.number().nonnegative().optional(),
    investmentDate: z.string().min(1).optional(),
    name: z.string().min(1).max(120).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required" });

export async function PUT(request: Request, context: { params: Promise<{ fundId: string }> }) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateFundSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { fundId } = await context.params;
  const [updatedFund] = await db
    .update(investmentFunds)
    .set({
      currentValue: parsed.data.currentValue?.toString(),
      indexAssetId: parsed.data.indexAssetId,
      initialInvestment: parsed.data.initialInvestment?.toString(),
      investmentDate: parsed.data.investmentDate ? new Date(parsed.data.investmentDate) : undefined,
      name: parsed.data.name,
    })
    .where(and(eq(investmentFunds.id, fundId), eq(investmentFunds.userId, userId)))
    .returning({
      currentValue: investmentFunds.currentValue,
      id: investmentFunds.id,
      indexAssetId: investmentFunds.indexAssetId,
      initialInvestment: investmentFunds.initialInvestment,
      investmentDate: investmentFunds.investmentDate,
      name: investmentFunds.name,
      updatedAt: investmentFunds.updatedAt,
    });

  if (!updatedFund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

  return NextResponse.json({
    currentValue: Number(updatedFund.currentValue),
    id: updatedFund.id,
    indexAssetId: updatedFund.indexAssetId,
    initialInvestment: Number(updatedFund.initialInvestment),
    investmentDate: updatedFund.investmentDate.toISOString(),
    name: updatedFund.name,
    updatedAt: updatedFund.updatedAt.toISOString(),
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ fundId: string }> }) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 404 });
  }

  const { fundId } = await context.params;
  const [deletedFund] = await db
    .delete(investmentFunds)
    .where(and(eq(investmentFunds.id, fundId), eq(investmentFunds.userId, userId)))
    .returning({ id: investmentFunds.id });

  if (!deletedFund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: deletedFund.id });
}