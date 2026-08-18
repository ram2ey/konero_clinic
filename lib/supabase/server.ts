import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client — for use in Server Components, Server
 * Actions, and Route Handlers.
 *
 * `cookies()` from Server Components is read-only, so `setAll` below will
 * throw there; the try/catch swallows that specific case. It's safe to
 * ignore only because `middleware.ts` refreshes the session cookie on
 * every request — if that middleware is ever removed, silently-failed
 * writes here would let sessions go stale without warning. In Server
 * Actions and Route Handlers `cookies()` is mutable, so `setAll` actually
 * persists refreshed tokens there.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — no-op, see comment above.
          }
        },
      },
    },
  );
}
