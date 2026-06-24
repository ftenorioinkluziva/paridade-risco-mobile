import { NextRequest, NextResponse } from "next/server";
import { getFinancialDataFetcher } from "@/lib/financialDataFetcher";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveUserId } from "@/lib/session";

const updatePricesRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update-all"),
    incremental: z.boolean().optional().default(true),
  }),
  z.object({
    action: z.literal("update-one"),
    ticker: z.string().trim().min(1, "ticker is required"),
    incremental: z.boolean().optional().default(false),
  }),
]);

/**
 * Check authorization for manual admin calls or trusted production cron calls.
 */
async function verifyPricesUpdateAuth(
  request: NextRequest,
): Promise<{ authorized: boolean; error?: string }> {
  const cronSecret = process.env.PRICE_UPDATE_CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (cronSecret && bearerToken === cronSecret) {
    return { authorized: true };
  }

  let userId = request.headers.get("x-user-id");

  if (!userId) {
    const resolved = await resolveUserId(request);
    if (resolved) userId = resolved;
  }

  if (!userId) {
    return { authorized: false, error: "Unauthorized: missing admin user or cron token" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || user.role !== "ADMIN") {
    return { authorized: false, error: "Forbidden: admin access required" };
  }

  return { authorized: true };
}

/**
 * POST /api/admin/prices
 * Trigger full or incremental price update for all active assets
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyPricesUpdateAuth(request);

    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const body = updatePricesRequestSchema.safeParse(await request.json());

    if (!body.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          issues: body.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (body.data.action === "update-all") {
      const fetcher = await getFinancialDataFetcher();
      const result = await fetcher.updateAllAssets(body.data.incremental);

      return NextResponse.json({
        success: result.success,
        message: result.message,
        results: result.results,
        timestamp: new Date().toISOString(),
      });
    }

    if (body.data.action === "update-one") {
      const fetcher = await getFinancialDataFetcher();
      const result = await fetcher.updateSpecificAsset(
        body.data.ticker,
        body.data.incremental,
      );

      return NextResponse.json({
        success: result.success,
        message: result.message,
        result,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'update-all' or 'update-one'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin prices endpoint error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/prices/status
 * Get update status for all assets
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyPricesUpdateAuth(request);

    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const fetcher = await getFinancialDataFetcher();
    const status = await fetcher.getUpdateStatus();

    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin prices status endpoint error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
