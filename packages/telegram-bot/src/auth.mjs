import { createHash, createHmac, randomBytes } from "node:crypto";

const scopes = new Map([
  ["/api/profile", "profile:read"],
  ["/api/portfolio/summary", "portfolio:read"],
  ["/api/rebalance/preview", "rebalance:read"],
  ["/api/assets/prices", "assets:read"],
  ["/api/baskets/active", "baskets:read"],
  ["/api/transactions", "transactions:read"],
  ["/api/funds", "funds:read"],
]);

export function telegramScopeForPath(pathname, method = "GET") {
  return method.toUpperCase() === "GET" ? scopes.get(pathname) ?? null : null;
}

export function signedTelegramHeaders({ path, chatId, secret, method = "GET", timestamp, nonce }) {
  const pathname = new URL(path, "https://internal.invalid").pathname;
  const scope = telegramScopeForPath(pathname, method);
  if (!scope) throw new Error(`Telegram scope is not defined for ${method} ${pathname}`);
  if (!secret || secret.length < 32) throw new Error("TELEGRAM_S2S_SECRET must contain at least 32 characters");
  const requestTimestamp = String(timestamp ?? Math.floor(Date.now() / 1000));
  const requestNonce = nonce ?? randomBytes(18).toString("base64url");
  const payload = [method.toUpperCase(), pathname, String(chatId), requestTimestamp, requestNonce, scope].join("\n");
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return {
    "x-paridade-consumer": "telegram",
    "x-telegram-chat-id": String(chatId),
    "x-telegram-nonce": requestNonce,
    "x-telegram-scope": scope,
    "x-telegram-signature": `v1=${signature}`,
    "x-telegram-timestamp": requestTimestamp,
  };
}

export function chatReference(chatId) {
  return createHash("sha256").update(String(chatId)).digest("hex").slice(0, 12);
}
