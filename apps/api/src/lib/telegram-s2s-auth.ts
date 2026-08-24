import { and, eq } from "drizzle-orm";
import { createHash } from "node:crypto";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { verifyTelegramRequest } from "@/lib/telegram-s2s-contract";

type TelegramEnv = {
  TELEGRAM_S2S_AUTH_ENABLED?: string;
  TELEGRAM_S2S_SECRET?: string;
  TELEGRAM_S2S_PREVIOUS_SECRET?: string;
};

function telegramReference(chatId: string) {
  return createHash("sha256").update(chatId).digest("hex").slice(0, 12);
}

function audit(request: Request, outcome: string, details: Record<string, string | undefined> = {}) {
  console.info(`[auth-telemetry] ${JSON.stringify({
    event: "telegram_s2s_auth",
    outcome,
    path: new URL(request.url).pathname,
    ...details,
  })}`);
}

export async function resolveTelegramUserId(request: Request, env: TelegramEnv = process.env as TelegramEnv) {
  const result = verifyTelegramRequest(request, {
    enabled: env.TELEGRAM_S2S_AUTH_ENABLED !== "false",
    currentSecret: env.TELEGRAM_S2S_SECRET,
    previousSecret: env.TELEGRAM_S2S_PREVIOUS_SECRET,
  });
  if (!result.valid) {
    audit(request, result.reason);
    return null;
  }

  const user = await db.query.users.findFirst({
    where: and(eq(users.telegramChatId, result.chatId), eq(users.isActive, true)),
    columns: { id: true },
  });
  if (!user) {
    audit(request, "link_missing", { chatRef: telegramReference(result.chatId), scope: result.scope });
    return null;
  }
  audit(request, "accepted", { chatRef: telegramReference(result.chatId), scope: result.scope, keyVersion: result.keyVersion });
  return user.id;
}
