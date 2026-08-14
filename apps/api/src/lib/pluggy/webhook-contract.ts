import { z } from "zod";

const webhookPayloadSchema = z.object({
  event: z.string().min(1).max(120),
  eventId: z.string().min(1).max(200),
  itemId: z.string().min(1).max(200).optional(),
  accountId: z.string().min(1).max(200).optional(),
  clientUserId: z.string().max(200).optional(),
  triggeredBy: z.string().max(40).optional(),
  id: z.string().min(1).max(200).optional(),
}).passthrough();

export type PluggyWebhookPayload = z.infer<typeof webhookPayloadSchema>;

export const PLUGGY_WEBHOOK_SYNC_EVENTS = new Set([
  "item/created",
  "item/updated",
  "item/login_succeeded",
  "transactions/created",
  "transactions/updated",
  "transactions/deleted",
]);

export const PLUGGY_WEBHOOK_STATUS_EVENTS = new Set([
  "item/error",
  "item/waiting_user_input",
  "item/waiting_user_action",
]);

export function parsePluggyWebhookPayload(input: unknown): PluggyWebhookPayload {
  return webhookPayloadSchema.parse(input);
}

function nestedData(payload: PluggyWebhookPayload): Record<string, unknown> {
  const value = payload.data;
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function extractPluggyItemId(payload: PluggyWebhookPayload): string | null {
  const data = nestedData(payload);
  return nonEmptyString(payload.itemId)
    ?? nonEmptyString(data.itemId)
    ?? nonEmptyString(payload.id)
    ?? nonEmptyString(data.id);
}

export function isPluggySyncWebhook(event: string): boolean {
  return PLUGGY_WEBHOOK_SYNC_EVENTS.has(event);
}

export function isPluggyStatusWebhook(event: string): boolean {
  return PLUGGY_WEBHOOK_STATUS_EVENTS.has(event);
}
