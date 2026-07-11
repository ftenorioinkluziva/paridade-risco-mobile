import { and, eq, gt } from "drizzle-orm";

import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";

export async function resolveUserId(request: Request) {
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
