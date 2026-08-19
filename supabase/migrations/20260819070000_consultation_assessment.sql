-- ============================================================================
-- Consultation assessment — replaces clinical_notes with the real form
-- ============================================================================
-- The original `clinical_notes` free-text field was a placeholder ahead
-- of the clinic's actual psychiatric clerking template: History, MSE,
-- Physical Exam (per-system), Summary, Items of Phenomenology, Management
-- Plan, Investigations, Risk Assessment, Prognosis. One `assessment`
-- jsonb column holds all of it as a structured object rather than ~10
-- separate text columns — none of these fields need SQL-level filtering,
-- so a migration isn't required every time a section is added or
-- reshaped (e.g. MSE is a single free-text field for now, but is
-- expected to later gain its own named sub-parameters the same way
-- physical_exam already has per-system keys — that's a value-shape
-- change the application layer can absorb without touching this column).
--
-- `clinical_notes` is dropped outright rather than kept dormant: nothing
-- has ever written to it (record_consultation has never been called from
-- a UI), so there's no data to preserve.
-- ============================================================================

alter table public.consultations
  add column if not exists assessment jsonb,
  drop column if exists clinical_notes;

drop function if exists public.record_consultation(uuid, uuid, jsonb, text, jsonb, jsonb, jsonb);

create or replace function public.record_consultation(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_vitals jsonb,
  p_assessment jsonb,
  p_diagnoses jsonb,
  p_prescriptions jsonb,
  p_invoice jsonb default null
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

  insert into public.consultations (patient_id, doctor_id, vitals, assessment)
  values (p_patient_id, p_doctor_id, p_vitals, p_assessment)
  returning id into v_consultation_id;

  if p_diagnoses is not null and jsonb_array_length(p_diagnoses) > 0 then
    insert into public.diagnoses (patient_id, consultation_id, condition, status)
    select
      p_patient_id,
      v_consultation_id,
      d->>'condition',
      coalesce((d->>'status')::public.record_status, 'active')
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

revoke all on function public.record_consultation(uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.record_consultation(uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;
