import test from "node:test";
import assert from "node:assert/strict";

import {
  extractPluggyItemId,
  isPluggyStatusWebhook,
  isPluggySyncWebhook,
  parsePluggyWebhookPayload,
} from "./webhook-contract";

test("parses an item webhook and extracts its item id", () => {
  const payload = parsePluggyWebhookPayload({
    event: "item/updated",
    eventId: "event-1",
    id: "item-1",
    triggeredBy: "SYNC",
  });

  assert.equal(extractPluggyItemId(payload), "item-1");
  assert.equal(isPluggySyncWebhook(payload.event), true);
});

test("extracts item id from transaction payloads and classifies status events", () => {
  const payload = parsePluggyWebhookPayload({
    event: "transactions/created",
    eventId: "event-2",
    itemId: "item-2",
    accountId: "account-2",
    transactionIds: ["transaction-1"],
  });

  assert.equal(extractPluggyItemId(payload), "item-2");
  assert.equal(isPluggySyncWebhook(payload.event), true);
  assert.equal(isPluggyStatusWebhook("item/error"), true);
});

test("rejects webhook payloads without event identity", () => {
  assert.throws(() => parsePluggyWebhookPayload({ event: "item/updated" }));
});
