import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { getPluggyProjection } from "@/lib/pluggy/projection";
import { PluggyClient } from "@/lib/pluggy/client";
import { getUserPluggyConfig, PluggyNotConfiguredError } from "@/lib/pluggy/config";
import { PluggySyncInProgressError, syncConfiguredPluggyItem } from "@/lib/pluggy/sync";
import { resolveUserId } from "@/lib/session";

export async function POST(request: Request) {
  const userId = await resolveUserId(request, { mcpPermission: "sync" });

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 401 });
  }

  try {
    const config = await getUserPluggyConfig(userId, db);
    const summary = await syncConfiguredPluggyItem({
      client: new PluggyClient(config),
      database: db,
      userId,
      config,
    });
    const projection = await getPluggyProjection(userId);

    return NextResponse.json({
      source: "PLUGGY",
      sync: summary,
      freshness: projection.freshness,
    });
  } catch (error) {
    if (error instanceof PluggyNotConfiguredError) {
      return NextResponse.json({
        error: error.message,
        code: "PLUGGY_NOT_CONFIGURED",
      }, { status: 400 });
    }

    if (error instanceof PluggySyncInProgressError) {
      return NextResponse.json({
        error: error.message,
        syncRunId: error.syncRunId,
      }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : "Não foi possível sincronizar o Pluggy";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
