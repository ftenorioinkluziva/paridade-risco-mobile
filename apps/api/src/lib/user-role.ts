export type AppRole = "admin" | "user";

export function normalizeRole(role: string | null | undefined): AppRole {
  return role?.trim().toLowerCase() === "admin" ? "admin" : "user";
}

export function isAdminRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "admin";
}
