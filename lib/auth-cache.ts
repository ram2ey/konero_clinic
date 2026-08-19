import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type CurrentUserRole = "doctor_admin" | "patient" | null;

export type CurrentProfile = {
  id: string;
  fullName: string | null;
  role: CurrentUserRole;
  email?: string | null;
};

/**
 * Request-level cached auth helper:
 * Deduplicates `supabase.auth.getUser()` and `profiles` role lookups
 * within the same render tree, preventing redundant round-trips between
 * root layout, sub-layouts, and page components.
 */
export const getCachedAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getCachedProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .single<{ id: string; full_name: string | null; role: CurrentUserRole }>();

  if (!profile) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
  };
});
