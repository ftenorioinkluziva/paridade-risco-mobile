import { NextResponse } from "next/server";

export async function GET() {
  console.info(`[auth-telemetry] ${JSON.stringify({ event: "telegram_legacy_token_endpoint", outcome: "gone" })}`);
  return NextResponse.json(
    { error: "Legacy Telegram session issuance has been removed", code: "TELEGRAM_LEGACY_SESSION_GONE" },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
        Deprecation: "true",
        Sunset: "Thu, 20 Aug 2026 00:00:00 GMT",
      },
    },
  );
}
