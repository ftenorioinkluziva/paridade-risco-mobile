import { createAccessControl } from "better-auth/plugins";

export const ac = createAccessControl({
  user: ["create", "list", "set-role", "ban", "get", "update", "delete"] as const,
  session: ["list", "revoke", "delete"] as const,
  portfolio: ["read", "update"] as const,
  basket: ["create", "read", "update", "delete"] as const,
  transaction: ["create", "read"] as const,
});

export const admin = ac.newRole({
  user: ["create", "list", "set-role", "ban", "get", "update", "delete"],
  session: ["list", "revoke", "delete"],
  portfolio: ["read", "update"],
  basket: ["create", "read", "update", "delete"],
  transaction: ["create", "read"],
});

export const user = ac.newRole({
  user: ["get"],
  session: [],
  portfolio: ["read"],
  basket: ["read"],
  transaction: ["create", "read"],
});
