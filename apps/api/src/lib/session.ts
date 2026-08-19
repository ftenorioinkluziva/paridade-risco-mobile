import { and, eq, gt } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";

export async function resolveUserId(request: Request) {
  // First, try legacy session resolution (for MCP/CLI/Telegram backward compat)
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const sessionToken = bearerToken ?? request.headers.get("x-session-token");

  if (sessionToken) {
    const session = await db.query.sessions.findFirst({
      where: and(eq(sessions.token, sessionToken), gt(sessions.expiresAt, new Date())),
      columns: { userId: true },
    });

    if (session) {
      return session.userId;
    }
  }

  // Fallback: Check Better Auth session via cookie (for web PWA)
  try {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const baSession = await auth.api.getSession({
        headers: new Headers({ cookie: cookieHeader }),
      });
      if (baSession?.user?.id) {
        return baSession.user.id;
      }
    }
  } catch {
    // Better Auth session lookup failed, continue to return null
  }

  return null;
}

export async function getSessionUser(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return null;
  }

  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}
