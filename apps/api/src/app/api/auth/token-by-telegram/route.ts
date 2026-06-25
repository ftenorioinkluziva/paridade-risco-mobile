import { and, eq, gt } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";

/**
 * GET /api/auth/token-by-telegram?chat_id=123456
 *
 * Returns a valid session token for the user linked to this Telegram chat_id.
 * Used by the Hermes Telegram bot to authenticate per-user MCP/API calls.
 *
 * Security: only returns a token if the user has explicitly set their
 * telegram_chat_id in their profile settings.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chat_id");

  if (!chatId) {
    return NextResponse.json(
      { error: "chat_id query parameter is required" },
      { status: 400 },
    );
  }

  // Find user by telegram chat id
  const user = await db.query.users.findFirst({
    where: and(
      eq(users.telegramChatId, chatId),
      eq(users.isActive, true),
    ),
    columns: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "No user found with this Telegram chat_id" },
      { status: 404 },
    );
  }

  // Check for existing valid session, reuse if found
  const existingSession = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.userId, user.id),
      gt(sessions.expiresAt, new Date()),
    ),
    columns: { token: true },
    orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
  });

  if (existingSession) {
    return NextResponse.json({
      token: existingSession.token,
      userId: user.id,
      name: user.name,
      email: user.email,
    });
  }

  // Create new session token (30 days)
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await db.insert(sessions).values({
    token,
    userId: user.id,
    expiresAt,
  });

  return NextResponse.json({
    token,
    userId: user.id,
    name: user.name,
    email: user.email,
  });
}