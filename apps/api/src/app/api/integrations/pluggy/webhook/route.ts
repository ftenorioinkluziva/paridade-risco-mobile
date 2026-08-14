import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { readPluggyWebhookConfig } from "@/lib/pluggy/config";
import { extractPluggyItemId, parsePluggyWebhookPayload } from "@/lib/pluggy/webhook-contract";
import { recordPluggyWebhookEvent } from "@/lib/pluggy/repository";

function secretsMatch(received: string | null, expected: string): boolean {
  if (!received) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  const webhookConfig = readPluggyWebhookConfig();
  if (!webhookConfig.secret) {
    return NextResponse.json({ error: "Pluggy webhook is not configured" }, { status: 503 });
  }
  if (!secretsMatch(request.headers.get(webhookConfig.header), webhookConfig.secret)) {
    return NextResponse.json({ error: "Invalid Pluggy webhook credentials" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid webhook JSON" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parsePluggyWebhookPayload(payload);
  } catch {
    return NextResponse.json({ error: "Invalid Pluggy webhook payload" }, { status: 400 });
  }

  try {
    const result = await recordPluggyWebhookEvent(db, {
      eventId: parsed.eventId,
      event: parsed.event,
      itemId: extractPluggyItemId(parsed),
      accountId: parsed.accountId ?? null,
      payload: parsed,
    });

    return NextResponse.json({ accepted: true, duplicate: result.duplicate }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Could not persist Pluggy webhook" }, { status: 503 });
  }
}
