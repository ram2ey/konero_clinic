-- ============================================================================
-- Consultation requests (public lead intake and conversion)
-- ============================================================================
-- Allows prospective clients to request a consultation via the public portal
-- or social media links (dralexvicokorda.com/request-consultation).
--
-- Admins can review pending requests, contact clients via phone/WhatsApp,
-- and approve/onboard them as registered patients with one click.
-- ============================================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'consultation_request_status') then
    create type public.consultation_request_status as enum ('pending', 'approved', 'contacted', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'consultation_mode') then
    create type public.consultation_mode as enum ('in_person', 'virtual', 'flexible');
  end if;
end $$;

create table if not exists public.consultation_requests (
  id                   uuid primary key default gen_random_uuid(),
  full_name            text not null,
  email                text not null,
  phone                text not null,
  dob                  date,
  sex                  public.sex,
  preferred_mode       public.consultation_mode not null default 'flexible',
  preferred_time       text,
  reason               text,
  status               public.consultation_request_status not null default 'pending',
  admin_notes          text,
  converted_patient_id uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Index for admin dashboard queries (filter by status and sort by created_at)
create index if not exists consultation_requests_status_idx on public.consultation_requests(status);
create index if not exists consultation_requests_created_at_idx on public.consultation_requests(created_at desc);

-- Enable RLS
alter table public.consultation_requests enable row level security;

-- Policies:
-- 1. Public can insert requests (anon + authenticated)
drop policy if exists "consultation_requests_public_insert" on public.consultation_requests;
create policy "consultation_requests_public_insert"
  on public.consultation_requests
  for insert
  to anon, authenticated
  with check (true);

-- 2. Admin has full access to read, update, delete
drop policy if exists "consultation_requests_admin_all" on public.consultation_requests;
create policy "consultation_requests_admin_all"
  on public.consultation_requests
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant insert on public.consultation_requests to anon, authenticated;
grant select, update, delete on public.consultation_requests to authenticated;
