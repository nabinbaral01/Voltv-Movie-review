import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "voltv_session";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always-public endpoints
  if (
    pathname === "/admin/login" ||
    pathname === "/api/admin/auth" ||
    pathname === "/api/poster"
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    // Presence-only gate at the edge. The real authorization check
    // (signature verification + live DB lookup for granted admins) runs
    // inside each admin page and API route via requireLiveAdmin().
    const adminToken = req.cookies.get("voltv_admin")?.value;
    if (!adminToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    // Admin routes don't require a regular user session
    return NextResponse.next();
  }

  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|placeholder-.*\\.svg|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)",
  ],
};
