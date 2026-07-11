import assert from "node:assert/strict";
import test from "node:test";
import { verifyPricesUpdateAuthorization } from "./admin-prices-auth";

const request = (headers: Record<string, string> = {}) => new Request("http://localhost/api/admin/prices", { headers });

test("common authenticated user receives forbidden", async () => {
  const result = await verifyPricesUpdateAuthorization(request(), {
    resolveIdentity: async () => "common-user",
    findUser: async () => ({ role: "USER" }),
  });
  assert.deepEqual(result, { authorized: false, error: "Forbidden: admin access required" });
});

test("administrator derived from validated session is authorized", async () => {
  const result = await verifyPricesUpdateAuthorization(request(), {
    resolveIdentity: async () => "session-admin",
    findUser: async (id) => id === "session-admin" ? { role: "ADMIN" } : null,
  });
  assert.deepEqual(result, { authorized: true });
});

test("x-user-id impersonation cannot replace validated session identity", async () => {
  const lookedUp = [] as string[];
  const result = await verifyPricesUpdateAuthorization(request({ "x-user-id": "admin-victim" }), {
    resolveIdentity: async () => "common-session-user",
    findUser: async (id) => { lookedUp.push(id); return { role: id === "admin-victim" ? "ADMIN" : "USER" }; },
  });
  assert.deepEqual(lookedUp, ["common-session-user"]);
  assert.equal(result.authorized, false);
});

test("missing validated session is unauthorized despite x-user-id", async () => {
  const result = await verifyPricesUpdateAuthorization(request({ "x-user-id": "admin-victim" }), {
    resolveIdentity: async () => null,
    findUser: async () => ({ role: "ADMIN" }),
  });
  assert.equal(result.authorized, false);
});
