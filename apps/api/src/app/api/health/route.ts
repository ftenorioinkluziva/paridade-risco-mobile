import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "paridade-risco-api",
    version: 1,
  });
}
