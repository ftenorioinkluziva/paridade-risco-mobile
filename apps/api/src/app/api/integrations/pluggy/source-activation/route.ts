import { NextResponse } from "next/server";

import { approvePluggySourceActivation, PluggySourceActivationBlockedError } from "@/lib/pluggy/source-activation";
import { resolveUserId } from "@/lib/session";

export async function POST(request: Request) {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "No user available" }, { status: 401 });

  try {
    return NextResponse.json(await approvePluggySourceActivation(userId));
  } catch (error) {
    if (error instanceof PluggySourceActivationBlockedError) {
      return NextResponse.json({ error: error.message, readiness: error.readiness }, { status: 409 });
    }
    throw error;
  }
}
