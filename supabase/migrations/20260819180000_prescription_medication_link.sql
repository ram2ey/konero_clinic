-- ============================================================================
-- Link prescriptions to the medications catalogue
-- ============================================================================
-- `medication_name` stays the single free-text label shown everywhere
-- (portal medications list, consultation detail, previous consultations) —
-- when a medication is picked from the catalogue it's populated with the
-- catalogue name, exactly as if the doctor had typed it. This mirrors how
-- icd11_code sits alongside diagnoses.condition (see
-- 20260819090000_diagnoses_icd11.sql).
--
-- `medication_id` is supplementary and nullable: plenty of prescriptions
-- will still be free text for products the catalogue doesn't carry. Its
-- value is that "which patients are on olanzapine" becomes a join rather
-- than a string match over a column where spelling drifts.
--
-- ON DELETE SET NULL, not RESTRICT: the catalogue is editable reference
-- data, and pruning a medicine the clinic no longer stocks must not be
-- blocked by — or cascade into — historical prescriptions. The name text
-- survives on the prescription either way, so nothing clinical is lost.
--
-- The function signature is unchanged (medication_id rides inside the
-- existing p_prescriptions jsonb), so no revoke/grant churn is needed and
-- no older overload is left behind.
-- ============================================================================

alter table public.prescriptions
  add column if not exists medication_id uuid references public.medications(id) on delete set null;

create index if not exists prescriptions_medication_id_idx
  on public.prescriptions (medication_id);

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
      -- nullif() first: '' would raise invalid_text_representation on the
      -- uuid cast, and a client sending an empty string is likelier than
      -- one omitting the key entirely.
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
