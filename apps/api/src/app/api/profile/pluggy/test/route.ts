import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { userPluggyCredentials } from "@/db/schema";
import { PluggyClient } from "@/lib/pluggy/client";
import { resolveUserId } from "@/lib/session";

const testPluggySchema = z.object({
  clientId: z.string().trim().min(1, "Client ID é obrigatório"),
  clientSecret: z.string().trim().optional(),
  itemId: z.string().trim().min(1, "Item ID é obrigatório"),
});

export async function POST(request: Request) {
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

  const parsed = testPluggySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  let secretToTest = parsed.data.clientSecret;
  if (!secretToTest) {
    const existing = await db.query.userPluggyCredentials.findFirst({
      where: eq(userPluggyCredentials.userId, userId),
    });
    secretToTest = existing?.clientSecret;
  }

  if (!secretToTest) {
    return NextResponse.json({ error: "Client Secret é obrigatório para testar" }, { status: 400 });
  }

  const apiBaseUrl = (process.env.PLUGGY_API_BASE_URL?.trim() || "https://api.pluggy.ai").replace(/\/+$/, "");

  try {
    const client = new PluggyClient({
      environment: process.env.PLUGGY_ENVIRONMENT === "production" ? "production" : "sandbox",
      apiBaseUrl,
      clientId: parsed.data.clientId,
      clientSecret: secretToTest,
      sandboxItemId: parsed.data.itemId,
      ignoreManualReconciliation: true,
    });

    const item = await client.getItem(parsed.data.itemId);
    const connectorName = (item.connector as { name?: string })?.name ?? "Conexão identificada";

    return NextResponse.json({
      success: true,
      connectorName,
      status: item.status ?? "UNKNOWN",
      message: `Conexão bem-sucedida com ${connectorName}!`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao autenticar na Pluggy";
    return NextResponse.json({
      success: false,
      error: message.includes("401") ? "Credenciais inválidas (Client ID ou Client Secret incorretos)" : message,
    }, { status: 400 });
  }
}
