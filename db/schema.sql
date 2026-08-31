-- ============================================================================
-- Konero Clinic — full schema for self-hosted PostgreSQL
-- ============================================================================
-- Single idempotent file. Replaces the 21-file supabase/migrations/ log
-- (an append-only history with reversals — only the end state matters).
--
-- Supabase-specific machinery is GONE: no auth.users (a plain `users`
-- table takes its place), no auth.uid(), no Row-Level Security / policies
-- / grants (per-patient isolation is now enforced in the app's
-- require-admin / require-clinical-access guards and the WHERE clauses of
-- every query), no storage.* (lab PDFs live on a disk volume), no
-- PostgREST. The one Postgres function worth keeping — record_consultation,
-- which writes a consultation + its diagnoses/prescriptions/invoice in a
-- single transaction — is preserved verbatim.
--
-- Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. ENUMs
-- ============================================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('doctor_admin', 'patient');
  end if;
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type public.invoice_status as enum ('pending', 'paid', 'overdue', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'record_status') then
    create type public.record_status as enum ('active', 'resolved', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'sex') then
    create type public.sex as enum ('male', 'female', 'intersex');
  end if;
  if not exists (select 1 from pg_type where typname = 'marital_status') then
    create type public.marital_status as enum
      ('single', 'married', 'divorced', 'widowed', 'separated', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'informant_reliability') then
    create type public.informant_reliability as enum
      ('reliable', 'partially_reliable', 'unreliable');
  end if;
  if not exists (select 1 from pg_type where typname = 'consultation_visit_type') then
    create type public.consultation_visit_type as enum ('first_visit', 'review');
  end if;
  if not exists (select 1 from pg_type where typname = 'consultation_request_status') then
    create type public.consultation_request_status as enum
      ('pending', 'approved', 'contacted', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'consultation_mode') then
    create type public.consultation_mode as enum ('in_person', 'virtual', 'flexible');
  end if;
end $$;

-- ============================================================================
-- 2. users — identity + credentials (replaces Supabase auth.users)
-- ============================================================================

create table if not exists public.users (
  id                   uuid primary key default gen_random_uuid(),
  email                text not null unique,          -- stored lowercased by the app
  password_hash        text not null,                 -- argon2id
  must_change_password boolean not null default false, -- was auth app_metadata flag
  email_confirmed      boolean not null default true,  -- kept for parity; always true now
  created_at           timestamptz not null default now()
);

-- ============================================================================
-- 3. profiles — one row per user, carries the role + all patient biodata
-- ============================================================================

create table if not exists public.profiles (
  id                       uuid primary key references public.users(id) on delete cascade,
  role                     public.user_role not null default 'patient',
  full_name                text,
  phone                    text,
  dob                      date,
  gender_identity          text,
  created_at               timestamptz not null default now(),
  sex                      public.sex,
  marital_status           public.marital_status,
  occupation               text,
  education_level           text,
  religion                 text,
  ethnicity                text,
  nationality              text,
  residence                text,
  next_of_kin_name         text,
  next_of_kin_relationship text,
  next_of_kin_contact      text,
  informant_name           text,
  informant_relationship   text,
  informant_reliability    public.informant_reliability,
  referral_source          text,
  referral_reason          text
);

comment on table public.profiles is 'One row per users row; carries the role and patient biodata.';

-- Enforce "exactly one doctor_admin" at the data layer.
create unique index if not exists profiles_single_admin_idx
  on public.profiles ((role))
  where role = 'doctor_admin';

create index if not exists profiles_role_idx on public.profiles (role);

-- ============================================================================
-- 4. Clinical tables
-- ============================================================================
-- Clinical/billing FKs use ON DELETE RESTRICT: a patient with any history
-- cannot be hard-deleted (medical/financial retention). Account closure is
-- an app-layer concern, not a cascade.

create table if not exists public.consultations (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete restrict,
  doctor_id  uuid references public.profiles(id) on delete set null,
  vitals     jsonb,
  assessment jsonb,
  visit_type public.consultation_visit_type not null default 'review',
  created_at timestamptz not null default now()
);

create table if not exists public.diagnoses (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete restrict,
  consultation_id uuid references public.consultations(id) on delete set null,
  condition       text not null,
  status          public.record_status not null default 'active',
  icd11_code      text,
  icd11_uri       text,
  created_at      timestamptz not null default now()
);

create table if not exists public.medications (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  form        text,
  strengths   text[] not null default '{}',
  drug_class  text,
  search_text text not null default '',
  created_at  timestamptz not null default now()
);

comment on table public.medications is
  'Reference catalogue of medications for prescription entry. Not patient data.';

create table if not exists public.prescriptions (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete restrict,
  consultation_id uuid references public.consultations(id) on delete set null,
  medication_name text not null,
  dosage          text not null,
  frequency       text not null,
  instructions    text,
  status          public.record_status not null default 'active',
  medication_id   uuid references public.medications(id) on delete set null,
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
  -- The stored path must begin with the owning patient's id — the same
  -- invariant the old Supabase Storage folder policy enforced. The upload
  -- route and a Zod refine check this too; this is the last-resort guard.
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

create table if not exists public.patient_history (
  patient_id uuid primary key references public.profiles(id) on delete restrict,
  history    jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index if not exists consultations_patient_id_idx  on public.consultations (patient_id);
create index if not exists diagnoses_patient_id_idx       on public.diagnoses (patient_id);
create index if not exists prescriptions_patient_id_idx   on public.prescriptions (patient_id);
create index if not exists prescriptions_medication_id_idx on public.prescriptions (medication_id);
create index if not exists lab_reports_patient_id_idx     on public.lab_reports (patient_id);
create index if not exists invoices_patient_id_idx        on public.invoices (patient_id);

-- ============================================================================
-- 5. Reference catalogues (icd11_codes / medications / lab_tests)
-- ============================================================================

create table if not exists public.icd11_codes (
  code  text primary key,
  title text not null,
  uri   text not null
);

create index if not exists icd11_codes_title_idx on public.icd11_codes (lower(title));

-- One row per (name, form); NULL form collapsed to '' so the seed's
-- ON CONFLICT target works and re-running the seed is a no-op.
create unique index if not exists medications_name_form_key
  on public.medications (name, coalesce(form, ''));

create table if not exists public.lab_tests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  aliases     text[] not null default '{}',
  category    text,
  specimen    text,
  search_text text not null default '',
  created_at  timestamptz not null default now()
);

comment on table public.lab_tests is
  'Reference catalogue of investigations (labs, imaging, procedures). Not patient data.';

-- search_text is a denormalised lowercase haystack maintained by triggers
-- because the useful search terms (drug class, test aliases) live in more
-- than one column. array_to_string() is STABLE not IMMUTABLE, so a
-- generated column can't do this — hence the trigger.

create or replace function public.medications_set_search_text()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_text := lower(concat_ws(' ', new.name, new.form, new.drug_class));
  return new;
end;
$$;

drop trigger if exists medications_search_text_trg on public.medications;
create trigger medications_search_text_trg
  before insert or update on public.medications
  for each row execute function public.medications_set_search_text();

create or replace function public.lab_tests_set_search_text()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_text := lower(
    concat_ws(' ', new.name, array_to_string(new.aliases, ' '), new.category)
  );
  return new;
end;
$$;

drop trigger if exists lab_tests_search_text_trg on public.lab_tests;
create trigger lab_tests_search_text_trg
  before insert or update on public.lab_tests
  for each row execute function public.lab_tests_set_search_text();

-- ============================================================================
-- 6. consultation_requests — public lead intake
-- ============================================================================

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

create index if not exists consultation_requests_status_idx     on public.consultation_requests (status);
create index if not exists consultation_requests_created_at_idx  on public.consultation_requests (created_at desc);

-- ============================================================================
-- 7. sessions — opaque server-side session tokens (replaces GoTrue JWTs)
-- ============================================================================

create table if not exists public.sessions (
  token      text primary key,
  user_id    uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists sessions_user_id_idx    on public.sessions (user_id);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

-- ============================================================================
-- 8. Throttle bookkeeping (self-pruning; only the app's DB role touches these)
-- ============================================================================

create table if not exists public.sign_in_attempts (
  id         bigint generated always as identity primary key,
  email      text not null,
  succeeded  boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists sign_in_attempts_email_created_idx
  on public.sign_in_attempts (email, created_at desc);

create table if not exists public.password_reset_requests (
  id         bigint generated always as identity primary key,
  email      text not null,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_requests_email_created_idx
  on public.password_reset_requests (email, created_at desc);

-- ============================================================================
-- 9. record_consultation — atomic multi-table write
-- ============================================================================
-- The app has no cross-statement transaction primitive at the call site
-- for this one, and recording a consultation must insert into
-- consultations + diagnoses + prescriptions + optionally invoices
-- atomically. A plpgsql function body is a single transaction, so a bad
-- row anywhere rolls the whole thing back. Ported verbatim from the final
-- migration (…180000_prescription_medication_link.sql); the Supabase
-- revoke/grant lines are dropped (no PostgREST role model here).

create or replace function public.record_consultation(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_vitals jsonb,
  p_assessment jsonb,
  p_diagnoses jsonb,
  p_prescriptions jsonb,
  p_invoice jsonb default null,
  p_visit_type public.consultation_visit_type default 'review'
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_consultation_id uuid;
begin
  -- The FK on consultations.patient_id only proves the id exists in
  -- profiles, not that it belongs to a patient.
  if not exists (
    select 1 from public.profiles where id = p_patient_id and role = 'patient'
  ) then
    raise exception 'invalid_patient';
  end if;

  insert into public.consultations (patient_id, doctor_id, vitals, assessment, visit_type)
  values (p_patient_id, p_doctor_id, p_vitals, p_assessment, p_visit_type)
  returning id into v_consultation_id;

  if p_diagnoses is not null and jsonb_array_length(p_diagnoses) > 0 then
    insert into public.diagnoses (patient_id, consultation_id, condition, status, icd11_code, icd11_uri)
    select
      p_patient_id,
      v_consultation_id,
      d->>'condition',
      coalesce((d->>'status')::public.record_status, 'active'),
      d->>'icd11_code',
      d->>'icd11_uri'
    from jsonb_array_elements(p_diagnoses) as d;
  end if;

  if p_prescriptions is not null and jsonb_array_length(p_prescriptions) > 0 then
    insert into public.prescriptions (
      patient_id, consultation_id, medication_name, dosage, frequency, instructions, status, medication_id
    )
    select
      p_patient_id,
      v_consultation_id,
      pr->>'medication_name',
      pr->>'dosage',
      pr->>'frequency',
      pr->>'instructions',
      coalesce((pr->>'status')::public.record_status, 'active'),
      nullif(pr->>'medication_id', '')::uuid
    from jsonb_array_elements(p_prescriptions) as pr;
  end if;

  if p_invoice is not null then
    insert into public.invoices (patient_id, amount, status, description)
    values (
      p_patient_id,
      (p_invoice->>'amount')::numeric,
      coalesce((p_invoice->>'status')::public.invoice_status, 'pending'),
      p_invoice->>'description'
    );
  end if;

  return v_consultation_id;
end;
$$;
