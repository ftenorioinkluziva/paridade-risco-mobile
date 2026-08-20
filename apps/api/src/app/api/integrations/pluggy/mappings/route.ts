import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { assets, pluggyInvestmentMappings, pluggyInvestments } from "@/db/schema";
import { executeIdempotentWrite } from "@/lib/idempotency";
import { resolveUserId } from "@/lib/session";

const createMappingSchema = z.object({
  investmentId: z.string().min(1),
  assetId: z.string().min(1).optional(),
  resolution: z.enum(["MAPEADO", "FORA_DA_ESTRATEGIA"]).default("MAPEADO"),
  reason: z.string().trim().min(1).max(240).optional(),
}).superRefine((value, context) => {
  if (value.resolution === "MAPEADO" && !value.assetId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["assetId"], message: "assetId is required for mapped investments" });
  }
  if (value.resolution === "FORA_DA_ESTRATEGIA" && !value.reason) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["reason"], message: "reason is required for outside-strategy decisions" });
  }
});

export async function POST(request: Request) {
  const userId = await resolveUserId(request, { mcpPermission: "mapping" });

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createMappingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [investment, asset] = await Promise.all([
    db.query.pluggyInvestments.findFirst({
      where: and(eq(pluggyInvestments.id, parsed.data.investmentId), eq(pluggyInvestments.userId, userId)),
      columns: { id: true },
    }),
    parsed.data.resolution === "MAPEADO" && parsed.data.assetId
      ? db.query.assets.findFirst({
        where: and(eq(assets.id, parsed.data.assetId), eq(assets.isActive, true)),
        columns: { id: true, ticker: true, name: true },
      })
      : Promise.resolve(null),
  ]);

  if (!investment) {
    return NextResponse.json({ error: "Pluggy investment not found" }, { status: 404 });
  }
  if (parsed.data.resolution === "MAPEADO" && !asset) {
    return NextResponse.json({ error: "Active asset not found" }, { status: 404 });
  }

  return executeIdempotentWrite({
    request,
    userId,
    operation: "pluggy-investment-mappings.upsert",
    payload: parsed.data,
    write: async (tx) => {
      const approvedAt = new Date();
      const [mapping] = await tx.insert(pluggyInvestmentMappings).values({
        userId,
        pluggyInvestmentId: investment.id,
        assetId: asset?.id ?? null,
        status: parsed.data.resolution,
        decisionReason: parsed.data.resolution === "FORA_DA_ESTRATEGIA" ? parsed.data.reason ?? null : null,
        approvedAt,
        updatedAt: approvedAt,
      }).onConflictDoUpdate({
        target: [pluggyInvestmentMappings.userId, pluggyInvestmentMappings.pluggyInvestmentId],
        set: {
          assetId: asset?.id ?? null,
          status: parsed.data.resolution,
          decisionReason: parsed.data.resolution === "FORA_DA_ESTRATEGIA" ? parsed.data.reason ?? null : null,
          approvedAt,
          updatedAt: approvedAt,
        },
      }).returning({
        id: pluggyInvestmentMappings.id,
        assetId: pluggyInvestmentMappings.assetId,
        investmentId: pluggyInvestmentMappings.pluggyInvestmentId,
        status: pluggyInvestmentMappings.status,
        decisionReason: pluggyInvestmentMappings.decisionReason,
        approvedAt: pluggyInvestmentMappings.approvedAt,
      });

      return {
        body: {
          id: mapping.id,
          investmentId: mapping.investmentId,
          assetId: mapping.assetId,
          assetTicker: asset?.ticker ?? null,
          assetName: asset?.name ?? null,
          status: mapping.status,
          decisionReason: mapping.decisionReason,
          approvedAt: mapping.approvedAt.toISOString(),
        },
        status: 200,
      };
    },
  });
}
