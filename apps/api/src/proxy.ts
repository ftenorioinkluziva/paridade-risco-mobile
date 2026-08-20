import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/~offline"];

export function isPublicPage(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/reset-password");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const isPublic = isPublicPage(pathname);
  const session = await auth.api.getSession({ headers: request.headers }).catch(() => null);

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && ["/login", "/signup"].includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};
