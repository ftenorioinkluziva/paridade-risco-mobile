import { PluggyClient } from "./client";
import { getUserPluggyConfig } from "./config";
import {
  findConnectionByItemId,
  finishPluggyWebhookEvent,
  setPluggyWebhookEventUser,
  updateConnectionWebhookStatus,
  type PluggyDatabase,
} from "./repository";
import { syncPluggyItem } from "./sync";
import {
  extractPluggyItemId,
  isPluggyStatusWebhook,
  isPluggySyncWebhook,
  parsePluggyWebhookPayload,
  type PluggyWebhookPayload,
} from "./webhook-contract";

export type ClaimedPluggyWebhookEvent = {
  id: string;
  event: string;
  itemId: string | null;
  attempts: number;
  payload: unknown;
};

function eventError(payload: PluggyWebhookPayload): string | null {
  const error = payload.error;
  if (typeof error === "string" && error.trim()) return error.slice(0, 500);
  if (error !== null && typeof error === "object" && !Array.isArray(error)) {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string" && message.trim()) return message.slice(0, 500);
  }
  return null;
}

export async function processPluggyWebhookEvent(input: {
  database: PluggyDatabase;
  event: ClaimedPluggyWebhookEvent;
}) {
  const payload = parsePluggyWebhookPayload(input.event.payload);
  const itemId = input.event.itemId ?? extractPluggyItemId(payload);
  if (!itemId) {
    return { status: "IGNORED" as const, reason: "EVENT_WITHOUT_ITEM_ID" };
  }

  const connection = await findConnectionByItemId(input.database, itemId);
  if (!connection) {
    return { status: "IGNORED" as const, reason: "UNKNOWN_ITEM" };
  }
  await setPluggyWebhookEventUser(input.database, { id: input.event.id, userId: connection.userId });

  if (isPluggySyncWebhook(input.event.event)) {
    const config = await getUserPluggyConfig(connection.userId, input.database);
    await syncPluggyItem({
      client: new PluggyClient(config),
      database: input.database,
      userId: connection.userId,
      itemId,
      config,
    });
    return { status: "SUCCEEDED" as const, reason: "ITEM_RESYNCED" };
  }

  if (isPluggyStatusWebhook(input.event.event)) {
    await updateConnectionWebhookStatus(input.database, {
      id: connection.id,
      status: input.event.event,
      error: eventError(payload),
    });
    return { status: "SUCCEEDED" as const, reason: "CONNECTION_STATUS_UPDATED" };
  }

  return { status: "IGNORED" as const, reason: "EVENT_NOT_ACTIONABLE" };
}

export async function processClaimedPluggyWebhookEvent(input: {
  database: PluggyDatabase;
  event: ClaimedPluggyWebhookEvent;
  maxAttempts: number;
}) {
  try {
    const result = await processPluggyWebhookEvent(input);
    await finishPluggyWebhookEvent(input.database, {
      id: input.event.id,
      status: result.status,
      processedAt: new Date(),
      lastError: result.status === "IGNORED" ? result.reason : null,
    });
    return result;
  } catch (error) {
    const processedAt = new Date();
    const retryable = input.event.attempts < input.maxAttempts;
    await finishPluggyWebhookEvent(input.database, {
      id: input.event.id,
      status: "FAILED",
      processedAt,
      nextAttemptAt: retryable ? new Date(processedAt.getTime() + Math.min(60, 2 ** input.event.attempts) * 60_000) : null,
      lastError: error instanceof Error ? error.message.slice(0, 500) : "Pluggy webhook processing failed",
    });
    throw error;
  }
}
