import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getSessionUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
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
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join(""),
    roleLabel: user.role === "ADMIN" ? "Administrador" : "Investidor",
  });
}
