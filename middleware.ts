import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const LOGIN_PATH = "/login";
const ADMIN_HOME = "/admin";
const PATIENT_HOME = "/portal";

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

  // Only fetch role when a routing decision actually depends on it — this
  // query runs as the signed-in user, scoped by the `profiles_patient_select`
  // / `profiles_admin_select` RLS policies, so it only ever returns their
  // own row.
  if (isAdminRoute || isPortalRoute || isLoginRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "doctor_admin";
    const homePath = isAdmin ? ADMIN_HOME : PATIENT_HOME;

    if (isLoginRoute) {
      return NextResponse.redirect(new URL(homePath, request.url));
    }

    if (isAdminRoute && !isAdmin) {
      return NextResponse.redirect(new URL(PATIENT_HOME, request.url));
    }

    if (isPortalRoute && isAdmin) {
      return NextResponse.redirect(new URL(ADMIN_HOME, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
