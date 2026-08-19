-- ============================================================================
-- prescriptions.dosage / frequency: enforce what the app already requires
-- ============================================================================
-- medication_name has always been `not null`, but dosage and frequency
-- were left nullable even though the only write path (record_consultation,
-- fed by record-consultation.ts's Zod schema) has always required both as
-- non-empty strings. That's a real DB/app contract gap: nothing at the
-- schema level would catch a future write path (a script, a bulk import)
-- inserting a prescription with no dosage/frequency.
--
-- The backfill runs first and is a no-op today (the only write path has
-- always supplied both), but it makes this migration safe to apply
-- regardless, rather than assuming the existing data is clean.
-- ============================================================================

update public.prescriptions set dosage = 'Not specified' where dosage is null;
update public.prescriptions set frequency = 'Not specified' where frequency is null;

alter table public.prescriptions
  alter column dosage set not null,
  alter column frequency set not null;
