import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/invite"];
const MANAGER_ONLY_PATHS = ["/policy"];
const PROTECTED_PATHS = ["/dashboard", "/vault", "/policy"];

export default auth((req) => {
  const { nextUrl, auth: session } = req as NextRequest & { auth: typeof req.auth };
  const pathname = nextUrl.pathname;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isManagerOnly = MANAGER_ONLY_PATHS.some((p) => pathname.startsWith(p));

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !session) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isPublic && session && !pathname.startsWith("/invite")) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  // RBAC: /policy is restricted to SUPER_ADMIN and MANAGER
  if (isManagerOnly && session) {
    const role = session.user?.role;
    if (role !== "SUPER_ADMIN" && role !== "MANAGER") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
