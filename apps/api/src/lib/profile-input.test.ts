import assert from "node:assert/strict";
import test from "node:test";

import { updateProfileSchema } from "./profile-input";

test("profile self-service accepts personal fields", () => {
  const result = updateProfileSchema.safeParse({
    phone: "+55 11 99999-0000",
    birthDate: "1990-01-01T12:00:00.000Z",
    telegramChatId: "123",
  });
  assert.equal(result.success, true);
});

test("profile self-service rejects role elevation and unknown fields", () => {
  const result = updateProfileSchema.safeParse({ phone: "+55 11 99999-0000", role: "admin" });
  assert.equal(result.success, false);
});
