import assert from "node:assert/strict";
import test from "node:test";

import { isAdminRole, normalizeRole } from "./user-role";

test("normalizes legacy and Better Auth role casing", () => {
  assert.equal(normalizeRole("ADMIN"), "admin");
  assert.equal(normalizeRole("admin"), "admin");
  assert.equal(normalizeRole("USER"), "user");
  assert.equal(normalizeRole(null), "user");
  assert.equal(isAdminRole("ADMIN"), true);
  assert.equal(isAdminRole("user"), false);
});
