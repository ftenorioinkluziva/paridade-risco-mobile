import { describe, it } from "node:test";
import assert from "node:assert";

describe("Better Auth Configuration", () => {
  it("exposes session, RBAC and scoped API-key lifecycle endpoints", async () => {
    const { auth } = await import("@/lib/auth");
    assert.equal(typeof auth.api.getSession, "function");
    assert.equal(typeof auth.api.userHasPermission, "function");
    assert.equal(typeof auth.api.createApiKey, "function");
    assert.equal(typeof auth.api.verifyApiKey, "function");
    assert.equal(typeof auth.api.deleteApiKey, "function");
  });

  it("permissions module exports correctly", async () => {
    const { ac, admin, user } = await import("@/lib/permissions");
    assert.ok(ac, "access control should be defined");
    assert.ok(admin, "admin role should be defined");
    assert.ok(user, "user role should be defined");
  });
});
