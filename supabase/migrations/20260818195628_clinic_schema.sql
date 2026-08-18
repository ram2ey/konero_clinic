-- ============================================================================
-- Clinic App — Core Schema & RLS Migration
-- ============================================================================
-- Idempotent: safe to re-run. Roles: doctor_admin (exactly one user), patient.
--
-- RLS recursion note: `is_admin()` is SECURITY DEFINER and owned by the
-- migration role (`postgres`), which owns every table below. Postgres table
-- owners bypass RLS by default, so when this function queries `profiles`
-- it does so as the owner and skips `profiles`' own RLS policies entirely —
-- even when those policies call `is_admin()` themselves. That is what
-- prevents infinite recursion. Do not change the function's owner to a
-- non-owning role, and do not add `FORCE ROW LEVEL SECURITY` to `profiles`
-- without re-checking this assumption.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. Custom types / ENUMs
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('doctor_admin', 'patient');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type public.invoice_status as enum ('pending', 'paid', 'overdue', 'cancelled');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'record_status') then
    create type public.record_status as enum ('active', 'resolved', 'cancelled');
  end if;
end $$;

-- ============================================================================
-- 2. profiles
-- ============================================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       public.user_role not null default 'patient',
  full_name  text,
  phone      text,
  dob        date,
  gender     text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth.users user; carries the role used by RLS policies.';

-- Enforce "doctor_admin only has 1 user" at the data layer, not just app logic.
create unique index if not exists profiles_single_admin_idx
  on public.profiles ((role))
  where role = 'doctor_admin';

create index if not exists profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

-- ============================================================================
-- 3. is_admin() — SECURITY DEFINER helper (breaks RLS recursion, see header)
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'doctor_admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ============================================================================
-- 4. Clinical tables
-- ============================================================================

-- Clinical/billing FKs use ON DELETE RESTRICT (not CASCADE): deleting a
-- profile — and therefore deleting the underlying auth.users row, since
-- profiles cascades from auth.users — must fail while any clinical or
-- billing record still references that patient. Medical and financial
-- records have retention obligations that outlive "delete my account";
-- account closure should be modeled as deactivation/anonymization in the
-- app layer, not a hard delete of a patient with a history.

create table if not exists public.consultations (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references public.profiles(id) on delete restrict,
  doctor_id      uuid references public.profiles(id) on delete set null,
  vitals         jsonb,
  clinical_notes text,
  created_at     timestamptz not null default now()
);

create table if not exists public.diagnoses (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete restrict,
  consultation_id uuid references public.consultations(id) on delete set null,
  condition       text not null,
  status          public.record_status not null default 'active',
  created_at      timestamptz not null default now()
);

create table if not exists public.prescriptions (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete restrict,
  consultation_id uuid references public.consultations(id) on delete set null,
  medication_name text not null,
  dosage          text,
  frequency       text,
  instructions    text,
  status          public.record_status not null default 'active',
  created_at      timestamptz not null default now()
);

create table if not exists public.lab_reports (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.profiles(id) on delete restrict,
  uploaded_by uuid references public.profiles(id) on delete set null,
  test_name   text not null,
  file_path   text not null,
  notes       text,
  created_at  timestamptz not null default now(),
  -- Ties the row to the patient's own storage folder (see storage policies
  -- below) so a patient can't record a lab_reports entry pointing at a
  -- path outside their own folder, even though it grants no extra storage
  -- access on its own.
  constraint lab_reports_file_path_scoped check (file_path like (patient_id::text || '/%'))
);

create table if not exists public.invoices (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.profiles(id) on delete restrict,
  amount      numeric(12, 2) not null check (amount >= 0),
  status      public.invoice_status not null default 'pending',
  description text,
  created_at  timestamptz not null default now()
);

-- Every RLS policy below filters on patient_id — index it everywhere.
create index if not exists consultations_patient_id_idx on public.consultations (patient_id);
create index if not exists diagnoses_patient_id_idx      on public.diagnoses (patient_id);
create index if not exists prescriptions_patient_id_idx  on public.prescriptions (patient_id);
create index if not exists lab_reports_patient_id_idx    on public.lab_reports (patient_id);
create index if not exists invoices_patient_id_idx       on public.invoices (patient_id);

-- ============================================================================
-- 5. Enable RLS everywhere
-- ============================================================================

alter table public.consultations enable row level security;
alter table public.diagnoses     enable row level security;
alter table public.prescriptions enable row level security;
alter table public.lab_reports   enable row level security;
alter table public.invoices      enable row level security;

-- ============================================================================
-- 5a. Explicit table grants
-- ============================================================================
-- RLS is only ever consulted after the table-level GRANT check passes.
-- Supabase's project bootstrap typically grants these by default, but this
-- migration should not rely on an assumption it never states — if that
-- default is ever absent, every policy below is unreachable dead code and
-- callers get a bare "permission denied for table" instead of a clean deny.

revoke all on public.profiles, public.consultations, public.diagnoses,
  public.prescriptions, public.lab_reports, public.invoices
  from anon;

grant select, insert, update, delete on public.profiles      to authenticated;
grant select, insert, update, delete on public.consultations to authenticated;
grant select, insert, update, delete on public.diagnoses     to authenticated;
grant select, insert, update, delete on public.prescriptions to authenticated;
grant select, insert, update, delete on public.lab_reports   to authenticated;
grant select, insert, update, delete on public.invoices      to authenticated;

-- ============================================================================
-- 6. RLS Policies
-- ============================================================================
-- Every table gets 4 explicit policies per role (SELECT/INSERT/UPDATE/DELETE).
-- Where a patient action is disallowed, the policy is written explicitly
-- with `false` rather than omitted, so the deny is auditable in this file
-- rather than relying on default-deny behavior.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select" on public.profiles
  for select using (public.is_admin());

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert" on public.profiles
  for insert with check (public.is_admin());

-- The self-row clause on both policies below prevents the sole admin from
-- ever locking the clinic out of admin access: they can freely manage any
-- patient row and edit their own non-role fields, but cannot demote or
-- delete the only doctor_admin account through the app.
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin())
  with check (public.is_admin() and (id <> auth.uid() or role = 'doctor_admin'));

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete" on public.profiles
  for delete using (public.is_admin() and id <> auth.uid());

drop policy if exists "profiles_patient_select" on public.profiles;
create policy "profiles_patient_select" on public.profiles
  for select using (id = auth.uid());

-- Patients may create only their own profile row, and only as 'patient'
-- (prevents self-promotion to doctor_admin at insert time).
drop policy if exists "profiles_patient_insert" on public.profiles;
create policy "profiles_patient_insert" on public.profiles
  for insert with check (id = auth.uid() and role = 'patient');

-- Patients may update their own row, but the resulting row must still be
-- 'patient' (prevents self-promotion via update).
drop policy if exists "profiles_patient_update" on public.profiles;
create policy "profiles_patient_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = 'patient');

drop policy if exists "profiles_patient_delete" on public.profiles;
create policy "profiles_patient_delete" on public.profiles
  for delete using (false);

-- ---------------------------------------------------------------------------
-- consultations
-- ---------------------------------------------------------------------------

drop policy if exists "consultations_admin_select" on public.consultations;
create policy "consultations_admin_select" on public.consultations
  for select using (public.is_admin());

drop policy if exists "consultations_admin_insert" on public.consultations;
create policy "consultations_admin_insert" on public.consultations
  for insert with check (public.is_admin());

drop policy if exists "consultations_admin_update" on public.consultations;
create policy "consultations_admin_update" on public.consultations
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "consultations_admin_delete" on public.consultations;
create policy "consultations_admin_delete" on public.consultations
  for delete using (public.is_admin());

drop policy if exists "consultations_patient_select" on public.consultations;
create policy "consultations_patient_select" on public.consultations
  for select using (patient_id = auth.uid());

drop policy if exists "consultations_patient_insert" on public.consultations;
create policy "consultations_patient_insert" on public.consultations
  for insert with check (false);

drop policy if exists "consultations_patient_update" on public.consultations;
create policy "consultations_patient_update" on public.consultations
  for update using (false);

drop policy if exists "consultations_patient_delete" on public.consultations;
create policy "consultations_patient_delete" on public.consultations
  for delete using (false);

-- ---------------------------------------------------------------------------
-- diagnoses
-- ---------------------------------------------------------------------------

drop policy if exists "diagnoses_admin_select" on public.diagnoses;
create policy "diagnoses_admin_select" on public.diagnoses
  for select using (public.is_admin());

drop policy if exists "diagnoses_admin_insert" on public.diagnoses;
create policy "diagnoses_admin_insert" on public.diagnoses
  for insert with check (public.is_admin());

drop policy if exists "diagnoses_admin_update" on public.diagnoses;
create policy "diagnoses_admin_update" on public.diagnoses
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "diagnoses_admin_delete" on public.diagnoses;
create policy "diagnoses_admin_delete" on public.diagnoses
  for delete using (public.is_admin());

drop policy if exists "diagnoses_patient_select" on public.diagnoses;
create policy "diagnoses_patient_select" on public.diagnoses
  for select using (patient_id = auth.uid());

drop policy if exists "diagnoses_patient_insert" on public.diagnoses;
create policy "diagnoses_patient_insert" on public.diagnoses
  for insert with check (false);

drop policy if exists "diagnoses_patient_update" on public.diagnoses;
create policy "diagnoses_patient_update" on public.diagnoses
  for update using (false);

drop policy if exists "diagnoses_patient_delete" on public.diagnoses;
create policy "diagnoses_patient_delete" on public.diagnoses
  for delete using (false);

-- ---------------------------------------------------------------------------
-- prescriptions
-- ---------------------------------------------------------------------------

drop policy if exists "prescriptions_admin_select" on public.prescriptions;
create policy "prescriptions_admin_select" on public.prescriptions
  for select using (public.is_admin());

drop policy if exists "prescriptions_admin_insert" on public.prescriptions;
create policy "prescriptions_admin_insert" on public.prescriptions
  for insert with check (public.is_admin());

drop policy if exists "prescriptions_admin_update" on public.prescriptions;
create policy "prescriptions_admin_update" on public.prescriptions
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "prescriptions_admin_delete" on public.prescriptions;
create policy "prescriptions_admin_delete" on public.prescriptions
  for delete using (public.is_admin());

drop policy if exists "prescriptions_patient_select" on public.prescriptions;
create policy "prescriptions_patient_select" on public.prescriptions
  for select using (patient_id = auth.uid());

drop policy if exists "prescriptions_patient_insert" on public.prescriptions;
create policy "prescriptions_patient_insert" on public.prescriptions
  for insert with check (false);

drop policy if exists "prescriptions_patient_update" on public.prescriptions;
create policy "prescriptions_patient_update" on public.prescriptions
  for update using (false);

drop policy if exists "prescriptions_patient_delete" on public.prescriptions;
create policy "prescriptions_patient_delete" on public.prescriptions
  for delete using (false);

-- ---------------------------------------------------------------------------
-- lab_reports (patients may INSERT their own — the one stated exception)
-- ---------------------------------------------------------------------------

drop policy if exists "lab_reports_admin_select" on public.lab_reports;
create policy "lab_reports_admin_select" on public.lab_reports
  for select using (public.is_admin());

drop policy if exists "lab_reports_admin_insert" on public.lab_reports;
create policy "lab_reports_admin_insert" on public.lab_reports
  for insert with check (public.is_admin());

drop policy if exists "lab_reports_admin_update" on public.lab_reports;
create policy "lab_reports_admin_update" on public.lab_reports
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lab_reports_admin_delete" on public.lab_reports;
create policy "lab_reports_admin_delete" on public.lab_reports
  for delete using (public.is_admin());

drop policy if exists "lab_reports_patient_select" on public.lab_reports;
create policy "lab_reports_patient_select" on public.lab_reports
  for select using (patient_id = auth.uid());

-- Exception: patients can upload their own lab reports.
drop policy if exists "lab_reports_patient_insert" on public.lab_reports;
create policy "lab_reports_patient_insert" on public.lab_reports
  for insert with check (patient_id = auth.uid());

drop policy if exists "lab_reports_patient_update" on public.lab_reports;
create policy "lab_reports_patient_update" on public.lab_reports
  for update using (false);

drop policy if exists "lab_reports_patient_delete" on public.lab_reports;
create policy "lab_reports_patient_delete" on public.lab_reports
  for delete using (false);

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------

drop policy if exists "invoices_admin_select" on public.invoices;
create policy "invoices_admin_select" on public.invoices
  for select using (public.is_admin());

drop policy if exists "invoices_admin_insert" on public.invoices;
create policy "invoices_admin_insert" on public.invoices
  for insert with check (public.is_admin());

drop policy if exists "invoices_admin_update" on public.invoices;
create policy "invoices_admin_update" on public.invoices
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "invoices_admin_delete" on public.invoices;
create policy "invoices_admin_delete" on public.invoices
  for delete using (public.is_admin());

drop policy if exists "invoices_patient_select" on public.invoices;
create policy "invoices_patient_select" on public.invoices
  for select using (patient_id = auth.uid());

drop policy if exists "invoices_patient_insert" on public.invoices;
create policy "invoices_patient_insert" on public.invoices
  for insert with check (false);

drop policy if exists "invoices_patient_update" on public.invoices;
create policy "invoices_patient_update" on public.invoices
  for update using (false);

drop policy if exists "invoices_patient_delete" on public.invoices;
create policy "invoices_patient_delete" on public.invoices
  for delete using (false);

-- ============================================================================
-- 7. Storage — private `lab-documents` bucket
-- ============================================================================
-- Path convention enforced by policy: lab-documents/<patient_uuid>/<file>
-- so storage.foldername(name)[1] is the owning patient's auth.uid().

insert into storage.buckets (id, name, public)
values ('lab-documents', 'lab-documents', false)
on conflict (id) do nothing;

-- storage.objects ships with RLS enabled by default in Supabase; this is
-- just a safety net in case the project ever disabled it.
alter table storage.objects enable row level security;

drop policy if exists "lab_documents_admin_select" on storage.objects;
create policy "lab_documents_admin_select" on storage.objects
  for select using (bucket_id = 'lab-documents' and public.is_admin());

drop policy if exists "lab_documents_admin_insert" on storage.objects;
create policy "lab_documents_admin_insert" on storage.objects
  for insert with check (bucket_id = 'lab-documents' and public.is_admin());

drop policy if exists "lab_documents_admin_update" on storage.objects;
create policy "lab_documents_admin_update" on storage.objects
  for update using (bucket_id = 'lab-documents' and public.is_admin())
  with check (bucket_id = 'lab-documents' and public.is_admin());

drop policy if exists "lab_documents_admin_delete" on storage.objects;
create policy "lab_documents_admin_delete" on storage.objects
  for delete using (bucket_id = 'lab-documents' and public.is_admin());

drop policy if exists "lab_documents_patient_select" on storage.objects;
create policy "lab_documents_patient_select" on storage.objects
  for select using (
    bucket_id = 'lab-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "lab_documents_patient_insert" on storage.objects;
create policy "lab_documents_patient_insert" on storage.objects
  for insert with check (
    bucket_id = 'lab-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "lab_documents_patient_update" on storage.objects;
create policy "lab_documents_patient_update" on storage.objects
  for update using (
    bucket_id = 'lab-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'lab-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "lab_documents_patient_delete" on storage.objects;
create policy "lab_documents_patient_delete" on storage.objects
  for delete using (
    bucket_id = 'lab-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
