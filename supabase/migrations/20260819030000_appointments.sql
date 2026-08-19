-- ============================================================================
-- appointments — the "booked, not yet worked" precursor to a consultation
-- ============================================================================
-- consultations is a completed-encounter record (vitals, notes, diagnoses,
-- prescriptions) — it has no "scheduled for later" state. This table is
-- that missing state: an admin books a patient in (optionally with a
-- preferred date/time — no calendar/slot logic, just a sortable field, per
-- the "simple queue" decision), it shows up in the doctor's queue, and
-- once worked it's linked to the consultation it produced and marked
-- completed. Deliberately lightweight: no time-slot conflict checking, no
-- multi-provider logic — matches the single-doctor_admin design already
-- enforced elsewhere in this schema.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type public.appointment_status as enum ('booked', 'completed', 'cancelled');
  end if;
end $$;

create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete restrict,
  consultation_id uuid references public.consultations(id) on delete set null,
  scheduled_at    timestamptz,
  status          public.appointment_status not null default 'booked',
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists appointments_patient_id_idx on public.appointments (patient_id);
create index if not exists appointments_status_idx on public.appointments (status);

alter table public.appointments enable row level security;

revoke all on public.appointments from anon;
grant select, insert, update, delete on public.appointments to authenticated;

-- Booking is an admin-initiated action in the described workflow (the
-- doctor/front-desk books a patient in), not patient self-service — so,
-- as with the clinical tables, patient policies here are explicit denies
-- rather than omissions.

drop policy if exists "appointments_admin_select" on public.appointments;
create policy "appointments_admin_select" on public.appointments
  for select using (public.is_admin());

drop policy if exists "appointments_admin_insert" on public.appointments;
create policy "appointments_admin_insert" on public.appointments
  for insert with check (public.is_admin());

drop policy if exists "appointments_admin_update" on public.appointments;
create policy "appointments_admin_update" on public.appointments
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "appointments_admin_delete" on public.appointments;
create policy "appointments_admin_delete" on public.appointments
  for delete using (public.is_admin());

drop policy if exists "appointments_patient_select" on public.appointments;
create policy "appointments_patient_select" on public.appointments
  for select using (patient_id = auth.uid());

drop policy if exists "appointments_patient_insert" on public.appointments;
create policy "appointments_patient_insert" on public.appointments
  for insert with check (false);

drop policy if exists "appointments_patient_update" on public.appointments;
create policy "appointments_patient_update" on public.appointments
  for update using (false);

drop policy if exists "appointments_patient_delete" on public.appointments;
create policy "appointments_patient_delete" on public.appointments
  for delete using (false);
