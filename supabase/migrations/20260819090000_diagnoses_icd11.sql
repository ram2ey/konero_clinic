-- ============================================================================
-- ICD-11 coding on diagnoses
-- ============================================================================
-- `condition` stays the single free-text label shown everywhere (portal,
-- admin diagnoses history, previous-consultations) — when a diagnosis is
-- picked from the WHO ICD-11 search it's populated with the matched
-- title, same as if the doctor had typed it. `icd11_code` and `icd11_uri`
-- are purely supplementary: nullable, since plenty of diagnoses will
-- still be free text with no clean ICD-11 match (or entered while the
-- WHO API is unreachable). `icd11_uri` is WHO's foundation/MMS entity URI
-- (e.g. http://id.who.int/icd/release/11/2024-01/mms/...) — kept
-- alongside the short code since it's the stable identifier if WHO ever
-- reshuffles code strings between releases.
-- ============================================================================

alter table public.diagnoses
  add column if not exists icd11_code text,
  add column if not exists icd11_uri text;

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

revoke all on function public.record_consultation(uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.record_consultation(uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;
