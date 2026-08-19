-- ============================================================================
-- Password reset throttling
-- ============================================================================
-- Bookkeeping table for actions/forgot-password.ts's app-level rate limiting:
-- tracks recent reset requests per email to prevent automated flooding / email
-- bombing, mirroring the sign_in_attempts throttling architecture.
--
-- No RLS policies needed: touched solely by the backend service-role client.
-- `revoke all` from anon/authenticated prevents any client-side access.
-- ============================================================================

create table if not exists public.password_reset_requests (
  id         bigint generated always as identity primary key,
  email      text not null,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_requests_email_created_idx
  on public.password_reset_requests (email, created_at desc);

alter table public.password_reset_requests enable row level security;

revoke all on public.password_reset_requests from anon, authenticated;
