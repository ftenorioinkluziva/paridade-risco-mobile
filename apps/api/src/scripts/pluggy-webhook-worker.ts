import { db, closeDb } from "../db/client";
import { PluggyClient } from "../lib/pluggy/client";
import { readPluggyConfig } from "../lib/pluggy/config";
import { claimNextPluggyWebhookEvent } from "../lib/pluggy/repository";
import { processClaimedPluggyWebhookEvent } from "../lib/pluggy/webhook-processing";

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
      client: new PluggyClient(readPluggyConfig()),
      event,
      maxAttempts,
    });
    console.log(`[pluggy-webhook-worker] event=${event.id} status=${result.status} reason=${result.reason}`);
  } catch (error) {
    console.error(`[pluggy-webhook-worker] event=${event.id} failed: ${error instanceof Error ? error.message : "unknown error"}`);
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
