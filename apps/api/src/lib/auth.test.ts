import { describe, it } from "node:test";
import assert from "node:assert";

describe("Better Auth Configuration", () => {
  it("auth module exports correctly", async () => {
    const { auth } = await import("@/lib/auth");
    assert.ok(auth, "auth should be defined");
  });

  it("permissions module exports correctly", async () => {
    const { ac, admin, user } = await import("@/lib/permissions");
    assert.ok(ac, "access control should be defined");
    assert.ok(admin, "admin role should be defined");
    assert.ok(user, "user role should be defined");
  });
});
