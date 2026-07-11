export type PricesAuthDependencies = {
  resolveIdentity: (request: Request) => Promise<string | null>;
  findUser: (userId: string) => Promise<{ role: string } | null | undefined>;
  cronSecret?: string;
};

export async function verifyPricesUpdateAuthorization(request: Request, dependencies: PricesAuthDependencies) {
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (dependencies.cronSecret && bearerToken === dependencies.cronSecret) return { authorized: true };

  const userId = await dependencies.resolveIdentity(request);
  if (!userId) return { authorized: false, error: "Unauthorized: missing admin user or cron token" };

  const user = await dependencies.findUser(userId);
  if (!user || user.role !== "ADMIN") return { authorized: false, error: "Forbidden: admin access required" };
  return { authorized: true };
}
