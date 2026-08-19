-- ============================================================================
-- Sign-in throttling
-- ============================================================================
-- Bookkeeping table for actions/sign-in.ts's app-level lockout: after a
-- run of failed attempts for one email within a short window, further
-- attempts are rejected without even calling Supabase Auth, on top of
-- whatever platform-level rate limiting Supabase Auth itself applies.
--
-- No RLS policies are needed here: this table is only ever touched by
-- the service-role client (see lib/supabase/admin.ts), specifically
-- because sign-in happens before there's an authenticated session to
-- scope a normal RLS policy to — there is no "own row" to check against.
-- Table ownership already bypasses RLS for that client, so `revoke all`
-- from anon/authenticated is the actual boundary: no session client, on
-- behalf of any user, can read or write this table at all.
-- ============================================================================

create table if not exists public.sign_in_attempts (
  id         bigint generated always as identity primary key,
  email      text not null,
  succeeded  boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists sign_in_attempts_email_created_idx
  on public.sign_in_attempts (email, created_at desc);

alter table public.sign_in_attempts enable row level security;

revoke all on public.sign_in_attempts from anon, authenticated;
