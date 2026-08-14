import { NextResponse } from "next/server";

import { approvePluggySource, PluggyMigrationBlockedError } from "@/lib/pluggy/migration";
import { resolveUserId } from "@/lib/session";

export async function POST(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 401 });
  }

  try {
    return NextResponse.json(await approvePluggySource(userId));
  } catch (error) {
    if (error instanceof PluggyMigrationBlockedError) {
      return NextResponse.json({ error: error.message, readiness: error.readiness }, { status: 409 });
    }
    throw error;
  }
}
