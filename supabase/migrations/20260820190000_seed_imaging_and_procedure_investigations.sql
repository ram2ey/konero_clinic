-- ============================================================================
-- Seed: imaging/radiology and endoscopic/invasive investigations
-- ============================================================================
-- The Investigations section of the consultation form has, until now, only
-- offered the biological/laboratory tests seeded into public.lab_tests by
-- 20260819170000_seed_lab_tests.sql (an EDL-derived catalogue plus a few
-- local additions). Ordering an MRI, an X-ray, or a lumbar puncture had no
-- catalogue support at all — free text only.
--
-- These are added to that SAME table rather than a parallel one: the
-- Investigations section is already one combobox backed by one search
-- action (actions/search-lab-tests.ts) and one jsonb array on the
-- consultation (assessment.lab_orders — see record-consultation.ts). A
-- test_name string doesn't care whether it names a blood test, a scan, or
-- a procedure, so there is nothing for a second table to do here except
-- duplicate the RLS, the trigger, and the UI. `category` is what keeps
-- them visually distinct in the dropdown (it renders as the result's
-- badge) — an MRI shows "Imaging & Radiology", not lumped in next to
-- "Haematology".
--
-- `specimen` is left null throughout: there is no biological specimen for
-- a scan or a procedure, and the UI already renders that field only when
-- present.
--
-- Idempotent: ON CONFLICT targets lab_tests.name, same as the seed this
-- extends.
-- ============================================================================

insert into public.lab_tests (name, aliases, category, specimen) values
  -- Imaging & Radiology
  ('MRI Brain', array['MRI head', 'Brain MRI', 'MRI'], 'Imaging & Radiology', null),
  ('MRI Spine', array['Spine MRI', 'MRI cervical spine', 'MRI lumbar spine'], 'Imaging & Radiology', null),
  ('MRI Abdomen', array['Abdominal MRI'], 'Imaging & Radiology', null),
  ('MRI Pelvis', array['Pelvic MRI'], 'Imaging & Radiology', null),
  ('MRI Joint', array['MRI knee', 'MRI shoulder'], 'Imaging & Radiology', null),
  ('CT Brain', array['CT head', 'Brain CT', 'CT scan brain'], 'Imaging & Radiology', null),
  ('CT Chest', array['Chest CT', 'CT thorax'], 'Imaging & Radiology', null),
  ('CT Abdomen and Pelvis', array['CT abdomen', 'CT AP'], 'Imaging & Radiology', null),
  ('CT Spine', array['Spine CT'], 'Imaging & Radiology', null),
  ('CT Angiography', array['CTA'], 'Imaging & Radiology', null),
  ('Chest X-ray', array['CXR', 'Chest radiograph'], 'Imaging & Radiology', null),
  ('Abdominal X-ray', array['AXR', 'Abdominal radiograph'], 'Imaging & Radiology', null),
  ('Skull X-ray', array['Skull radiograph'], 'Imaging & Radiology', null),
  ('Spine X-ray', array['Spine radiograph'], 'Imaging & Radiology', null),
  ('Limb X-ray', array['Extremity X-ray', 'Bone X-ray'], 'Imaging & Radiology', null),
  ('Electrocardiogram', array['ECG', 'EKG'], 'Imaging & Radiology', null),
  ('Echocardiogram', array['Echo', 'Cardiac ultrasound'], 'Imaging & Radiology', null),
  ('Ultrasound Abdomen', array['Abdominal ultrasound', 'USS abdomen'], 'Imaging & Radiology', null),
  ('Ultrasound Pelvis', array['Pelvic ultrasound', 'USS pelvis'], 'Imaging & Radiology', null),
  ('Obstetric Ultrasound', array['Antenatal scan', 'Pregnancy scan'], 'Imaging & Radiology', null),
  ('Doppler Ultrasound', array['Vascular doppler', 'Doppler scan'], 'Imaging & Radiology', null),
  ('Mammography', array['Mammogram'], 'Imaging & Radiology', null),
  ('DEXA Bone Density Scan', array['DEXA scan', 'Bone density scan'], 'Imaging & Radiology', null),
  ('PET Scan', array['PET-CT', 'Positron emission tomography'], 'Imaging & Radiology', null),

  -- Endoscopic & Invasive Investigations
  ('Gastroscopy', array['OGD', 'Upper GI endoscopy', 'Oesophagogastroduodenoscopy'], 'Endoscopic & Invasive Investigations', null),
  ('Colonoscopy', array['Lower GI endoscopy'], 'Endoscopic & Invasive Investigations', null),
  ('Sigmoidoscopy', array['Flexible sigmoidoscopy'], 'Endoscopic & Invasive Investigations', null),
  ('Bronchoscopy', array[]::text[], 'Endoscopic & Invasive Investigations', null),
  ('Cystoscopy', array[]::text[], 'Endoscopic & Invasive Investigations', null),
  ('Endoscopic Retrograde Cholangiopancreatography', array['ERCP'], 'Endoscopic & Invasive Investigations', null),
  ('Diagnostic Laparoscopy', array['Laparoscopy'], 'Endoscopic & Invasive Investigations', null),
  ('Lumbar Puncture', array['LP', 'Spinal tap'], 'Endoscopic & Invasive Investigations', null),
  ('Bone Marrow Aspiration and Biopsy', array['Bone marrow biopsy', 'BMAT'], 'Endoscopic & Invasive Investigations', null),
  ('Liver Biopsy', array[]::text[], 'Endoscopic & Invasive Investigations', null),
  ('Renal Biopsy', array['Kidney biopsy'], 'Endoscopic & Invasive Investigations', null),
  ('Skin Biopsy', array[]::text[], 'Endoscopic & Invasive Investigations', null),
  ('Pleural Tap', array['Thoracocentesis', 'Pleural aspiration'], 'Endoscopic & Invasive Investigations', null),
  ('Ascitic Tap', array['Paracentesis', 'Abdominal paracentesis'], 'Endoscopic & Invasive Investigations', null),
  ('Joint Aspiration', array['Arthrocentesis'], 'Endoscopic & Invasive Investigations', null)
on conflict (name) do nothing;
