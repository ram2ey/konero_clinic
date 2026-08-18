-- ============================================================================
-- record_consultation RPC
-- ============================================================================
-- The JS/PostgREST client has no multi-statement transaction primitive —
-- each `.from(...).insert(...)` call is its own independent transaction.
-- Recording a consultation needs to insert into consultations, diagnoses,
-- prescriptions, and optionally invoices atomically: a failure partway
-- through (e.g. a bad prescription row) must not leave an orphaned
-- consultation with no diagnoses. Wrapping all of it in a single plpgsql
-- function gives real atomicity — the whole function body runs inside one
-- transaction, and any exception rolls it all back.
--
-- Deliberately `security invoker` (the default — stated explicitly here
-- for auditability): the function runs as the calling role, so every
-- insert below is still checked against that table's own RLS policies.
-- If `requireAdmin()` in the calling Server Action ever had a bug, the
-- `..._admin_insert` policies on consultations/diagnoses/prescriptions/
-- invoices are still there to reject a non-admin caller — this function
-- adds atomicity, it does not replace RLS as the authorization boundary.
-- ============================================================================

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
  -- The FK on consultations.patient_id only proves the id exists in
  -- profiles, not that it belongs to a patient — without this check an
  -- admin could accidentally record a consultation against their own (or
  -- another admin's) profile id.
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
