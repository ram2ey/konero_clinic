-- ============================================================================
-- lab-documents bucket hardening
-- ============================================================================
-- components/LabUploader.tsx checks file type and size client-side before
-- upload, but that is UX only — anyone can call the Storage API directly
-- with any content-type and skip the component entirely. The only check
-- that actually can't be bypassed is on the bucket itself, enforced by
-- Supabase Storage server-side. Keep MAX_FILE_SIZE_BYTES in
-- lib/lab-upload-constraints.ts in sync with file_size_limit below.
-- ============================================================================

update storage.buckets
set
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'],
  file_size_limit = 15728640 -- 15 MiB
where id = 'lab-documents';
