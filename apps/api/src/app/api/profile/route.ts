import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { resolveUserId } from "@/lib/session";
import { updateProfileSchema } from "@/lib/profile-input";
import { isAdminRole, normalizeRole } from "@/lib/user-role";

export async function GET(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      selectedBasket: {
        columns: {
          name: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    telegramChatId: user.telegramChatId ?? null,
    image: user.image,
    role: normalizeRole(user.role),
    birthDate: user.birthDate?.toISOString() ?? null,
    initials: user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase() ?? "")
      .join(""),
    roleLabel: isAdminRole(user.role) ? "Administrador" : "Investidor",
    activeBasketName: user.selectedBasket?.name ?? "Sem cesta ativa",
  });
}

export async function PUT(request: Request) {
  const userId = await resolveUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updatedUser] = await db
    .update(users)
    .set({
      birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
      image: parsed.data.image ?? null,
      phone: parsed.data.phone ?? null,
      telegramChatId: parsed.data.telegramChatId ?? null,
    })
    .where(eq(users.id, userId))
    .returning({
      birthDate: users.birthDate,
      id: users.id,
      image: users.image,
      phone: users.phone,
      telegramChatId: users.telegramChatId,
    });

  return NextResponse.json({
    birthDate: updatedUser.birthDate?.toISOString() ?? null,
    id: updatedUser.id,
    image: updatedUser.image,
    phone: updatedUser.phone,
    telegramChatId: updatedUser.telegramChatId ?? null,
  });
}
