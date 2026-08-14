import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { listPluggyWebhookEvents } from "@/lib/pluggy/repository";
import { resolveUserId } from "@/lib/session";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "No user available" }, { status: 401 });

  const events = await listPluggyWebhookEvents(db, userId);
  return NextResponse.json(events.map((event) => ({
    ...event,
    receivedAt: event.receivedAt.toISOString(),
    processedAt: event.processedAt?.toISOString() ?? null,
  })));
}
