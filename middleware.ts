import { NextResponse, type NextRequest } from "next/server";

const LOGIN_PATH = "/login";

/**
 * Edge middleware can't reach Postgres (`pg` is Node-only), so it does a
 * cheap cookie-presence gate and nothing more:
 *
 *  - No `session` cookie + a protected route (/admin, /portal) → bounce to
 *    /login, remembering where they were headed.
 *
 * Everything authoritative — is this a real, unexpired session; is the
 * user a doctor_admin or a patient; does `must_change_password` force them
 * to /auth/set-password — happens in the Node runtime: `app/admin/layout.tsx`,
 * `app/portal/layout.tsx`, `app/auth/set-password/page.tsx`, and the
 * sign-in action. Those already hit the DB and redirect, and the app has
 * always treated the layouts as the source of truth for role-gating.
 *
 * A signed-in user hitting /login is left alone here — the login page
 * itself checks the session and routes them onward.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has("session");

  const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/portal");

  if (isProtected && !hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("redirect_to", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
