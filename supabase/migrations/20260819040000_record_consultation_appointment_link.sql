-- ============================================================================
-- record_consultation: link to the appointment it completes
-- ============================================================================
-- Adds an optional p_appointment_id. When a consultation is recorded from
-- the doctor's active queue (see appointments), this closes the loop in
-- the same transaction as the consultation itself: the appointment is
-- marked completed and linked to the consultation it produced. A
-- Postgres function's identity includes its parameter types, so adding a
-- parameter creates a new overload rather than replacing the old one —
-- the old 7-arg signature is dropped explicitly first so it doesn't stick
-- around as a duplicate, callable-but-orphaned overload.
-- ============================================================================

drop function if exists public.record_consultation(uuid, uuid, jsonb, text, jsonb, jsonb, jsonb);

create or replace function public.record_consultation(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_vitals jsonb,
  p_clinical_notes text,
  p_diagnoses jsonb,
  p_prescriptions jsonb,
  p_invoice jsonb default null,
  p_appointment_id uuid default null
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

  insert into public.consultations (patient_id, doctor_id, vitals, clinical_notes)
  values (p_patient_id, p_doctor_id, p_vitals, p_clinical_notes)
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

  if p_appointment_id is not null then
    -- Matched on patient_id + status='booked' too: a mismatched or
    -- already-handled appointment id just silently doesn't update rather
    -- than failing the whole encounter — the consultation record is what
    -- matters, a stale queue item is a minor, recoverable UX issue.
    update public.appointments
    set status = 'completed', consultation_id = v_consultation_id
    where id = p_appointment_id
      and patient_id = p_patient_id
      and status = 'booked';
  end if;

  return v_consultation_id;
end;
$$;

revoke all on function public.record_consultation(uuid, uuid, jsonb, text, jsonb, jsonb, jsonb, uuid) from public;
grant execute on function public.record_consultation(uuid, uuid, jsonb, text, jsonb, jsonb, jsonb, uuid) to authenticated;
