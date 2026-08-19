-- ============================================================================
-- Remove appointments
-- ============================================================================
-- Reverses 20260819030000_appointments.sql and
-- 20260819040000_record_consultation_appointment_link.sql. The booking
-- queue turned out to be more ceremony than a solo-practice workflow
-- needs — the doctor now works directly from the patient list instead of
-- a formal "booked" state. record_consultation reverts to its
-- pre-appointment-link signature (kept as a separate migration rather
-- than editing the earlier ones, since those are already applied —
-- migrations are an append-only log, not history to rewrite).
-- ============================================================================

drop function if exists public.record_consultation(uuid, uuid, jsonb, text, jsonb, jsonb, jsonb, uuid);

create or replace function public.record_consultation(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_vitals jsonb,
  p_clinical_notes text,
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

  return v_consultation_id;
end;
$$;

revoke all on function public.record_consultation(uuid, uuid, jsonb, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.record_consultation(uuid, uuid, jsonb, text, jsonb, jsonb, jsonb) to authenticated;

drop table if exists public.appointments;
drop type if exists public.appointment_status;
