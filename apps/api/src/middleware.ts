import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Validate session if cookie exists
  let isValidSession = false;
  if (sessionCookie) {
    try {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const session = await auth.api.getSession({
          headers: new Headers({ cookie: cookieHeader }),
        });
        isValidSession = Boolean(session?.user);
      }
    } catch {
      // Session validation failed, treat as invalid
    }
  }

  if (isValidSession && ["/login", "/signup"].includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    !isValidSession &&
    !pathname.startsWith("/api") &&
    pathname !== "/login" &&
    pathname !== "/signup" &&
    !pathname.startsWith("/reset-password")
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};
