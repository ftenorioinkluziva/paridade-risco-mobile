import { NextRequest, NextResponse } from "next/server";
import { getFinancialDataFetcher } from "@/lib/financialDataFetcher";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Middleware to check admin authorization
 */
async function verifyAdminAuth(
  userId: string | null
): Promise<{ authorized: boolean; error?: string }> {
  if (!userId) {
    return { authorized: false, error: "Unauthorized: missing user" };
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
 * POST /api/admin/prices/update-all
 * Trigger full or incremental price update for all active assets
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const auth = await verifyAdminAuth(userId);

    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 403 });
    }

    const { action, incremental } = await request.json();

    if (action === "update-all") {
      const fetcher = await getFinancialDataFetcher();
      const result = await fetcher.updateAllAssets(incremental !== false);

      return NextResponse.json({
        success: true,
        message: result.message,
        results: result.results,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "update-one") {
      const { ticker } = await request.json();
      if (!ticker) {
        return NextResponse.json(
          { error: "Missing ticker parameter" },
          { status: 400 }
        );
      }

      const fetcher = await getFinancialDataFetcher();
      const result = await fetcher.updateSpecificAsset(ticker);

      return NextResponse.json({
        success: result.success,
        message: result.message,
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
    const userId = request.headers.get("x-user-id");
    const auth = await verifyAdminAuth(userId);

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
