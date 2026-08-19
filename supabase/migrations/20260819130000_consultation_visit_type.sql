-- ============================================================================
-- Visit type on consultations: first_visit vs review
-- ============================================================================
-- Tags each consultation as either a patient's first visit or a follow-up
-- review. Stored explicitly (not derived from "is this the earliest
-- consultation row for the patient") so a clinician's judgment call
-- survives even when it doesn't match that naive heuristic - e.g. a
-- patient seen elsewhere before this system existed, or a deliberate
-- re-flagging after a multi-year gap. The client suggests a default by
-- checking for prior consultations, but this column is what actually
-- gets stored, and it's editable at record time.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'consultation_visit_type') then
    create type public.consultation_visit_type as enum ('first_visit', 'review');
  end if;
end $$;

-- Existing rows predate this column and have no reliable historical
-- answer - 'review' is the safer default for unknown history (it doesn't
-- retroactively claim a past consultation was someone's first visit).
alter table public.consultations
  add column if not exists visit_type public.consultation_visit_type not null default 'review';

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
security invoker
set search_path = public
as $$
declare
  v_consultation_id uuid;
begin
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
      patient_id, consultation_id, medication_name, dosage, frequency, instructions, status
    )
    select
      p_patient_id,
      v_consultation_id,
      pr->>'medication_name',
      pr->>'dosage',
      pr->>'frequency',
      pr->>'instructions',
      coalesce((pr->>'status')::public.record_status, 'active')
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

revoke all on function public.record_consultation(uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb, public.consultation_visit_type) from public;
grant execute on function public.record_consultation(uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb, public.consultation_visit_type) to authenticated;

-- Superseded by the 8-arg overload above - drop it so there's exactly one
-- record_consultation to call (Postgres would otherwise keep both, since
-- function identity includes the parameter list).
drop function if exists public.record_consultation(uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb);
