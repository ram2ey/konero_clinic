-- ============================================================================
-- Expanded patient biodata
-- ============================================================================
-- Brings profiles up to the clinic's actual intake form. Two notable
-- decisions baked in here:
--
--  1. `gender` is renamed to `gender_identity` and a new, separate `sex`
--     column is added. These were conflated into one field originally;
--     the intake form calls for both independently (sex for clinical/
--     administrative purposes, gender identity for how the patient
--     identifies) — genuinely different data, not a duplicate.
--  2. Every new column here is nullable. Only name/sex/dob/phone are
--     required at registration (enforced in the Zod schema, not here) —
--     the rest of this intake data often isn't known until the actual
--     assessment, and there's deliberately no NOT NULL forcing it to
--     exist upfront.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'sex') then
    create type public.sex as enum ('male', 'female', 'intersex');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'marital_status') then
    create type public.marital_status as enum
      ('single', 'married', 'divorced', 'widowed', 'separated', 'other');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'informant_reliability') then
    create type public.informant_reliability as enum
      ('reliable', 'partially_reliable', 'unreliable');
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'gender'
  ) then
    alter table public.profiles rename column gender to gender_identity;
  end if;
end $$;

alter table public.profiles
  add column if not exists sex public.sex,
  add column if not exists marital_status public.marital_status,
  add column if not exists occupation text,
  add column if not exists education_level text,
  add column if not exists religion text,
  add column if not exists ethnicity text,
  add column if not exists nationality text,
  add column if not exists residence text,
  add column if not exists next_of_kin_name text,
  add column if not exists next_of_kin_relationship text,
  add column if not exists next_of_kin_contact text,
  add column if not exists informant_name text,
  add column if not exists informant_relationship text,
  add column if not exists informant_reliability public.informant_reliability,
  add column if not exists referral_source text,
  add column if not exists referral_reason text;
