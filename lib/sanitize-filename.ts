/**
 * Strips characters that are awkward or unsafe in a storage object key.
 * This is hygiene, not a security boundary: the patientId path segment
 * that precedes this in the storage key (see LabUploader) is a UUID we
 * control, so nothing in a filename can be used to escape a patient's own
 * storage folder — see the `(storage.foldername(name))[1]` RLS policies
 * in supabase/migrations.
 */
export function sanitizeFileName(name: string): string {
  const trimmed = name.trim().slice(-150);
  return trimmed.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}
