import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { retryPluggyWebhookEvent } from "@/lib/pluggy/repository";
import { resolveUserId } from "@/lib/session";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "No user available" }, { status: 401 });

  const { eventId } = await context.params;
  const event = await retryPluggyWebhookEvent(db, { id: eventId, userId });
  if (!event) return NextResponse.json({ error: "Webhook event is not retryable" }, { status: 409 });
  return NextResponse.json({ accepted: true, eventId: event.id }, { status: 202 });
}
