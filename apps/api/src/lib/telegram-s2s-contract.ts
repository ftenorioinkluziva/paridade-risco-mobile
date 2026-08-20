import { createHmac, timingSafeEqual } from "node:crypto";

export const TELEGRAM_HEADERS = {
  chatId: "x-telegram-chat-id",
  nonce: "x-telegram-nonce",
  scope: "x-telegram-scope",
  signature: "x-telegram-signature",
  timestamp: "x-telegram-timestamp",
} as const;

export type TelegramScope =
  | "assets:read"
  | "baskets:read"
  | "funds:read"
  | "portfolio:read"
  | "profile:read"
  | "rebalance:read"
  | "transactions:read";

export type TelegramVerificationFailure =
  | "disabled"
  | "missing_headers"
  | "invalid_identity"
  | "invalid_timestamp"
  | "expired_request"
  | "invalid_nonce"
  | "insufficient_scope"
  | "invalid_signature"
  | "replay";

export class TelegramNonceStore {
  private readonly entries = new Map<string, number>();

  consume(nonce: string, expiresAt: number, now: number) {
    for (const [key, expiry] of this.entries) {
      if (expiry <= now) this.entries.delete(key);
    }
    if (this.entries.has(nonce)) return false;
    this.entries.set(nonce, expiresAt);
    return true;
  }
}

export function telegramScopeForPath(pathname: string, method = "GET"): TelegramScope | null {
  if (method.toUpperCase() !== "GET") return null;
  if (pathname === "/api/profile") return "profile:read";
  if (pathname === "/api/portfolio/summary") return "portfolio:read";
  if (pathname === "/api/rebalance/preview") return "rebalance:read";
  if (pathname === "/api/assets/prices") return "assets:read";
  if (pathname === "/api/baskets/active") return "baskets:read";
  if (pathname === "/api/transactions") return "transactions:read";
  if (pathname === "/api/funds") return "funds:read";
  return null;
}

export function telegramSignaturePayload(input: {
  method: string;
  pathname: string;
  chatId: string;
  timestamp: string;
  nonce: string;
  scope: string;
}) {
  return [input.method.toUpperCase(), input.pathname, input.chatId, input.timestamp, input.nonce, input.scope].join("\n");
}

export function signTelegramRequest(secret: string, input: Parameters<typeof telegramSignaturePayload>[0]) {
  return `v1=${createHmac("sha256", secret).update(telegramSignaturePayload(input)).digest("hex")}`;
}

function secureSignatureMatch(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function verifyTelegramRequest(
  request: Request,
  options: {
    enabled?: boolean;
    currentSecret?: string;
    previousSecret?: string;
    now?: number;
    maxSkewSeconds?: number;
    nonceStore?: TelegramNonceStore;
  } = {},
): { valid: true; chatId: string; scope: TelegramScope; keyVersion: "current" | "previous" } | { valid: false; reason: TelegramVerificationFailure } {
  if (options.enabled === false) return { valid: false, reason: "disabled" };

  const chatId = request.headers.get(TELEGRAM_HEADERS.chatId) ?? "";
  const timestamp = request.headers.get(TELEGRAM_HEADERS.timestamp) ?? "";
  const nonce = request.headers.get(TELEGRAM_HEADERS.nonce) ?? "";
  const claimedScope = request.headers.get(TELEGRAM_HEADERS.scope) ?? "";
  const signature = request.headers.get(TELEGRAM_HEADERS.signature) ?? "";
  if (!chatId || !timestamp || !nonce || !claimedScope || !signature) return { valid: false, reason: "missing_headers" };
  if (!/^-?\d{1,20}$/.test(chatId)) return { valid: false, reason: "invalid_identity" };

  const timestampSeconds = Number(timestamp);
  if (!Number.isSafeInteger(timestampSeconds)) return { valid: false, reason: "invalid_timestamp" };
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const maxSkewSeconds = options.maxSkewSeconds ?? 60;
  if (Math.abs(now - timestampSeconds) > maxSkewSeconds) return { valid: false, reason: "expired_request" };
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) return { valid: false, reason: "invalid_nonce" };

  const pathname = new URL(request.url).pathname;
  const requiredScope = telegramScopeForPath(pathname, request.method);
  if (!requiredScope || claimedScope !== requiredScope) return { valid: false, reason: "insufficient_scope" };

  const input = { method: request.method, pathname, chatId, timestamp, nonce, scope: claimedScope };
  const candidates = [
    ["current", options.currentSecret],
    ["previous", options.previousSecret],
  ] as const;
  const match = candidates.find(([, secret]) => secret && secret.length >= 32 && secureSignatureMatch(signature, signTelegramRequest(secret, input)));
  if (!match) return { valid: false, reason: "invalid_signature" };

  const store = options.nonceStore ?? defaultTelegramNonceStore;
  if (!store.consume(`${chatId}:${nonce}`, timestampSeconds + maxSkewSeconds + 1, now)) return { valid: false, reason: "replay" };
  return { valid: true, chatId, scope: requiredScope, keyVersion: match[0] };
}

export const defaultTelegramNonceStore = new TelegramNonceStore();
