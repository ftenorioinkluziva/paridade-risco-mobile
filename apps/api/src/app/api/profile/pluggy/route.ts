import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { userPluggyCredentials } from "@/db/schema";
import { resolveUserId } from "@/lib/session";

const updatePluggyCredentialsSchema = z.object({
  clientId: z.string().trim().min(1, "Client ID é obrigatório"),
  clientSecret: z.string().trim().optional(),
  itemId: z.string().trim().min(1, "Item ID é obrigatório"),
});

function maskSecret(secret: string): string {
  if (secret.length <= 8) return "••••••••";
  return `••••••••${secret.slice(-4)}`;
}

export async function GET(request: Request) {
  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const credentials = await db.query.userPluggyCredentials.findFirst({
    where: eq(userPluggyCredentials.userId, userId),
  });

  if (!credentials) {
    return NextResponse.json({
      isConfigured: false,
      clientId: null,
      itemId: null,
      hasSecret: false,
      secretMasked: null,
      updatedAt: null,
    });
  }

  return NextResponse.json({
    isConfigured: true,
    clientId: credentials.clientId,
    itemId: credentials.itemId,
    hasSecret: Boolean(credentials.clientSecret),
    secretMasked: credentials.clientSecret ? maskSecret(credentials.clientSecret) : null,
    updatedAt: credentials.updatedAt?.toISOString() ?? null,
  });
}

export async function PUT(request: Request) {
  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const parsed = updatePluggyCredentialsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const existing = await db.query.userPluggyCredentials.findFirst({
    where: eq(userPluggyCredentials.userId, userId),
  });

  const secretToSave = parsed.data.clientSecret && parsed.data.clientSecret.length > 0
    ? parsed.data.clientSecret
    : existing?.clientSecret;

  if (!secretToSave) {
    return NextResponse.json({ error: "Client Secret é obrigatório" }, { status: 400 });
  }

  const now = new Date();
  await db.insert(userPluggyCredentials).values({
    userId,
    clientId: parsed.data.clientId,
    clientSecret: secretToSave,
    itemId: parsed.data.itemId,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: userPluggyCredentials.userId,
    set: {
      clientId: parsed.data.clientId,
      clientSecret: secretToSave,
      itemId: parsed.data.itemId,
      updatedAt: now,
    },
  });

  return NextResponse.json({
    isConfigured: true,
    clientId: parsed.data.clientId,
    itemId: parsed.data.itemId,
    hasSecret: true,
    secretMasked: maskSecret(secretToSave),
    updatedAt: now.toISOString(),
  });
}

export async function DELETE(request: Request) {
  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  await db.delete(userPluggyCredentials).where(eq(userPluggyCredentials.userId, userId));

  return NextResponse.json({
    isConfigured: false,
    message: "Credenciais da Pluggy removidas com sucesso",
  });
}
