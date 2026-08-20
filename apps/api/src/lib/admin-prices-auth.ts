import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/user-role";

export type PricesAuthDependencies = {
  resolveIdentity: (request: Request) => Promise<string | null>;
  findUser: (userId: string) => Promise<{ role?: string | null } | null | undefined>;
  cronSecret?: string;
};

export async function verifyPricesUpdateAuthorization(request: Request, dependencies: PricesAuthDependencies) {
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (dependencies.cronSecret && bearerToken === dependencies.cronSecret) return { authorized: true };

  const userId = await dependencies.resolveIdentity(request);
  if (!userId) return { authorized: false, error: "Unauthorized: missing admin user or cron token" };

  // Use Better Auth hasPermission to check admin access
  try {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const session = await auth.api.getSession({
        headers: new Headers({ cookie: cookieHeader }),
      });
      if (session?.user) {
        const hasPermission = await auth.api.userHasPermission({
          body: {
            userId: session.user.id,
            permissions: { user: ["create"] }, // Any admin permission would work
          },
        });
        if (hasPermission) return { authorized: true };
      }
    }
  } catch {
    // Better Auth permission check failed, fall back to legacy role check
  }

  // Fallback: Legacy role check for backward compatibility
  const user = await dependencies.findUser(userId);
  if (!user || !isAdminRole(user.role)) return { authorized: false, error: "Forbidden: admin access required" };
  return { authorized: true };
}
