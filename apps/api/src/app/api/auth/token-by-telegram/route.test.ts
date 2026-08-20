import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "./route";

test("legacy Telegram endpoint is permanently gone and never emits a token", async () => {
  const response = await GET();
  assert.equal(response.status, 410);
  assert.equal(response.headers.get("deprecation"), "true");
  const body = await response.json();
  assert.equal(body.code, "TELEGRAM_LEGACY_SESSION_GONE");
  assert.equal("token" in body, false);
});
