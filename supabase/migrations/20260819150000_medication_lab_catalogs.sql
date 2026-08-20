-- ============================================================================
-- Medication and lab-test catalogues (selectable reference data)
-- ============================================================================
-- Same shape and rationale as icd11_codes (see
-- 20260819100000_icd11_codes.sql): local, offline reference tables the
-- admin UI searches with ILIKE, so picking a medication or ordering a lab
-- test is a selection rather than free typing — while free text stays
-- available everywhere for anything the catalogue doesn't cover.
--
-- Sources (see the seed migrations that follow):
--   medications — WHO Model List of Essential Medicines, 24th list (2025)
--   lab_tests   — WHO Model List of Essential In Vitro Diagnostics (EDL)
--
-- `search_text` is a denormalised lowercase haystack maintained by a
-- trigger. It exists because the interesting search terms live in more
-- than one column: a doctor types "FBC" (an alias), or "antipsychotic"
-- (a drug class), not only the canonical name. A generated column can't
-- do this — array_to_string() is STABLE, not IMMUTABLE, so Postgres
-- rejects it in a GENERATED ALWAYS expression — hence the trigger.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- medications
-- ----------------------------------------------------------------------------

create table if not exists public.medications (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  -- Dosage form as printed by the source list ("Tablet (scored)",
  -- "Powder for injection"). Null for medicines listed only as a
  -- therapeutic alternative, which carry no formulation of their own.
  form       text,
  strengths  text[] not null default '{}',
  drug_class text,
  search_text text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.medications is
  'Reference catalogue of medications for prescription entry. Not patient data.';

-- One row per (name, form). A plain UNIQUE constraint would not do here:
-- NULL form values never collide with each other under SQL NULL
-- semantics, so "Acenocoumarol/null" could be inserted repeatedly. The
-- expression index collapses NULL to '' so the seed's ON CONFLICT target
-- actually works and re-running the seed stays a no-op.
create unique index if not exists medications_name_form_key
  on public.medications (name, coalesce(form, ''));

-- Deliberately no index on search_text. The lookup is
-- `search_text ILIKE '%query%'`, and a leading wildcard makes a btree
-- index unusable — it would be dead weight that only misleads whoever
-- reads this next. At ~750 rows the sequential scan is sub-millisecond.
-- If these catalogues ever grow by an order of magnitude, the fix is a
-- trigram index (`create extension pg_trgm` and a GIN index using
-- gin_trgm_ops), not a btree.

-- ----------------------------------------------------------------------------
-- lab_tests
-- ----------------------------------------------------------------------------

create table if not exists public.lab_tests (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  -- Clinical shorthand the doctor is likely to type: 'FBC' must find
  -- 'Complete blood count', 'U&E' must find the electrolyte panel.
  aliases    text[] not null default '{}',
  category   text,
  specimen   text,
  search_text text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.lab_tests is
  'Reference catalogue of laboratory investigations. Not patient data.';

-- ----------------------------------------------------------------------------
-- search_text maintenance
-- ----------------------------------------------------------------------------

create or replace function public.medications_set_search_text()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Strengths are deliberately excluded: including them would make a
  -- query like "10 mg" match half the catalogue.
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

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
-- Neither table holds patient data, so read access is about who needs the
-- picker rather than about confidentiality.
--
-- medications: admin only, matching icd11_codes — prescribing is an
-- admin-only workflow.
--
-- lab_tests: any authenticated user. This is deliberate and differs from
-- the other two catalogues: LabUploader runs in the patient portal
-- (components/LabUploader.tsx), where patients name the test they are
-- uploading a result for. Under an is_admin() policy their dropdown would
-- silently return nothing.

alter table public.medications enable row level security;
revoke all on public.medications from anon;
grant select on public.medications to authenticated;

drop policy if exists "medications_admin_select" on public.medications;
create policy "medications_admin_select" on public.medications
  for select using (public.is_admin());

alter table public.lab_tests enable row level security;
revoke all on public.lab_tests from anon;
grant select on public.lab_tests to authenticated;

drop policy if exists "lab_tests_authenticated_select" on public.lab_tests;
create policy "lab_tests_authenticated_select" on public.lab_tests
  for select to authenticated using (true);
