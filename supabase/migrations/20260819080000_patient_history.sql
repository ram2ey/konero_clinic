-- ============================================================================
-- Patient history — one row per patient, separate from per-visit consultations
-- ============================================================================
-- The clinic's psychiatric clerking "HISTORY" template (Presenting
-- Complaint(s) through Premorbid Personality) is taken once per patient, not
-- once per visit, so it lives in its own table instead of inside
-- consultations.assessment. One jsonb `history` column holds the whole
-- structured template, same reasoning as consultations.assessment: no
-- SQL-level filtering is needed on individual sections, so the section list
-- can grow without a migration.
-- ============================================================================

create table if not exists public.patient_history (
  patient_id uuid primary key references public.profiles(id) on delete restrict,
  history    jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.patient_history enable row level security;

revoke all on public.patient_history from anon;
grant select, insert, update, delete on public.patient_history to authenticated;

-- ---------------------------------------------------------------------------
-- patient_history — same shape as the consultations policies: admin has full
-- CRUD, patient can read their own row but never write it themselves.
-- ---------------------------------------------------------------------------

drop policy if exists "patient_history_admin_select" on public.patient_history;
create policy "patient_history_admin_select" on public.patient_history
  for select using (public.is_admin());

drop policy if exists "patient_history_admin_insert" on public.patient_history;
create policy "patient_history_admin_insert" on public.patient_history
  for insert with check (public.is_admin());

drop policy if exists "patient_history_admin_update" on public.patient_history;
create policy "patient_history_admin_update" on public.patient_history
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "patient_history_admin_delete" on public.patient_history;
create policy "patient_history_admin_delete" on public.patient_history
  for delete using (public.is_admin());

drop policy if exists "patient_history_patient_select" on public.patient_history;
create policy "patient_history_patient_select" on public.patient_history
  for select using (patient_id = auth.uid());

drop policy if exists "patient_history_patient_insert" on public.patient_history;
create policy "patient_history_patient_insert" on public.patient_history
  for insert with check (false);

drop policy if exists "patient_history_patient_update" on public.patient_history;
create policy "patient_history_patient_update" on public.patient_history
  for update using (false);

drop policy if exists "patient_history_patient_delete" on public.patient_history;
create policy "patient_history_patient_delete" on public.patient_history
  for delete using (false);
