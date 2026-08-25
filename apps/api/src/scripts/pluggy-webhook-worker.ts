import { db, closeDb } from "../db/client";
import { claimNextPluggyWebhookEvent } from "../lib/pluggy/repository";
import { processClaimedPluggyWebhookEvent } from "../lib/pluggy/webhook-processing";
import {
  classifyPluggyOperationalError,
  getErrorCode,
  getErrorStatus,
  logOperationalEvent,
  operationalCorrelationId,
} from "../lib/operational-observability";

const pollMs = Math.max(1000, Number(process.env.PLUGGY_WEBHOOK_POLL_MS ?? 5000));
const maxAttempts = Math.max(1, Number(process.env.PLUGGY_WEBHOOK_MAX_ATTEMPTS ?? 5));
let running = true;

const sleep = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

async function processOne() {
  const event = await claimNextPluggyWebhookEvent(db, { now: new Date(), maxAttempts });
  if (!event) return false;

  try {
    const result = await processClaimedPluggyWebhookEvent({
      database: db,
      event,
      maxAttempts,
    });
    console.log(`[pluggy-webhook-worker] status=${result.status} reason=${result.reason}`);
    logOperationalEvent("pluggy_webhook_finished", {
      worker: "pluggy-webhook",
      correlationId: operationalCorrelationId(event.id, event.itemId),
      status: result.status,
      reason: result.reason,
      attempts: event.attempts,
    });
  } catch (error) {
    console.error(`[pluggy-webhook-worker] failed: ${getErrorCode(error)}`);
    const status = getErrorStatus(error);
    const code = getErrorCode(error);
    logOperationalEvent("pluggy_webhook_failed", {
      worker: "pluggy-webhook",
      correlationId: operationalCorrelationId(event.id, event.itemId),
      category: classifyPluggyOperationalError({ status, code, unavailable: status === 0 || (status !== undefined && status >= 500) || code.includes("UNAVAILABLE") }),
      code,
      status: status ?? null,
      attempts: event.attempts,
      retryable: event.attempts < maxAttempts,
    });
  }
  return true;
}

async function main() {
  console.log(`[pluggy-webhook-worker] started: pollMs=${pollMs} maxAttempts=${maxAttempts}`);
  while (running) {
    const processed = await processOne();
    if (!processed) await sleep(pollMs);
  }
  await closeDb();
}

process.on("SIGINT", () => { running = false; });
process.on("SIGTERM", () => { running = false; });

main().catch(async (error) => {
  console.error(`[pluggy-webhook-worker] fatal: ${error instanceof Error ? error.message : "unknown error"}`);
  await closeDb();
  process.exitCode = 1;
});
