import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/~offline"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let API requests and Next.js assets pass through
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Public pages are always accessible without middleware redirects
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/reset-password")
  ) {
    return NextResponse.next();
  }

  // Protected pages require an active session cookie
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};
