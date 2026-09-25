import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

/**
 * Sends visitors without a valid session from /admin to /login. This is only
 * a convenience redirect: the admin page and every admin Server Action check
 * the session themselves.
 */
export async function proxy(request: NextRequest) {
  const adminId = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET,
    process.env.ADMIN_ID,
  );

  if (!adminId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
