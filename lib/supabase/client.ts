import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * Browser-side Supabase client, memoized as a module-level singleton.
 * Without the cache, every call site that imports this module and calls
 * `createClient()` spins up its own GoTrueClient instance, which triggers
 * Supabase's "Multiple GoTrueClient instances detected" warning and can
 * cause auth state to fall out of sync across components.
 */
export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  return client;
}
