export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// Client-side check only, for fast feedback before attempting an upload.
// The boundary that actually can't be bypassed is the lab-documents
// bucket's own file_size_limit (see supabase/migrations) — keep this in
// sync with that value.
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
