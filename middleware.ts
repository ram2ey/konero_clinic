import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LOGIN_PATH = "/login";
const ADMIN_HOME = "/admin";
const PATIENT_HOME = "/portal";
const SET_PASSWORD_PATH = "/auth/set-password";

export async function middleware(request: NextRequest) {
  // Mutated inside `setAll` below and returned at the end — this is the
  // response that actually carries refreshed auth cookies back to the
  // browser. Any early `return` in this function must return one of these
  // response objects (or a redirect), never a bare `NextResponse.next()`,
  // or a refreshed session silently fails to persist.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not add logic between client creation and this call. `getUser()`
  // revalidates the token against Supabase Auth (unlike `getSession()`,
  // which only reads the local cookie) and is also what triggers the
  // token refresh this middleware exists to perform.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isPortalRoute = pathname.startsWith("/portal");
  const isLoginRoute = pathname === LOGIN_PATH;

  if (!user) {
    if (isAdminRoute || isPortalRoute) {
      const url = request.nextUrl.clone();
      url.pathname = LOGIN_PATH;
      url.searchParams.set("redirect_to", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Patients registered by the clinic get a generated temporary password
  // and must replace it before using the portal (see
  // actions/register-patient.ts). The flag lives in app_metadata, which
  // is already on the `user` object above — so this guard costs no extra
  // round trip, unlike a profiles lookup would.
  //
  // Everything under /auth is exempt, or setting the password would
  // redirect to itself forever. The flag is cleared by
  // actions/complete-password-change.ts once the new password is saved.
  if (user.app_metadata?.must_change_password === true && !pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL(SET_PASSWORD_PATH, request.url));
  }

  // Only fetch role here for /login — a signed-in user landing there needs
  // to be routed to the right home before the login form ever renders, and
  // that's a rare, one-time-per-session visit so the extra round trip is
  // cheap. /admin and /portal used to run this same query on *every*
  // navigation (in addition to the identical role lookup app/admin/layout.tsx
  // and app/portal/layout.tsx already do for their own UI), which meant two
  // sequential Supabase round trips of pure auth overhead before a page even
  // started fetching its own data. That query is gone here now — those
  // layouts are the single source of truth for role-gating /admin and
  // /portal, and still redirect away anything that doesn't match.
  if (isLoginRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "doctor_admin";
    return NextResponse.redirect(new URL(isAdmin ? ADMIN_HOME : PATIENT_HOME, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
