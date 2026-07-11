import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { loginSchema } from "@paridade-risco/shared";

import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { operationErrorResponse } from "@/lib/operation-response";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return operationErrorResponse({ code: "INVALID_INPUT", category: "validation", message: "Login input is invalid", retryable: false, invalidFields: [...new Set(parsed.error.issues.map((issue) => issue.path.join(".") || "input"))] }, 400);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });

  if (!user || !user.isActive) {
    return operationErrorResponse({ code: "INVALID_CREDENTIALS", category: "authorization", message: "Invalid email or password", retryable: false }, 401);
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    return operationErrorResponse({ code: "INVALID_CREDENTIALS", category: "authorization", message: "Invalid email or password", retryable: false }, 401);
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await db.insert(sessions).values({
    token,
    userId: user.id,
    expiresAt,
  });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
      role: user.role,
      birthDate: user.birthDate?.toISOString() ?? null,
      initials: user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase() ?? "")
        .join(""),
      roleLabel: user.role === "ADMIN" ? "Administrador" : "Investidor",
    },
  });
}
