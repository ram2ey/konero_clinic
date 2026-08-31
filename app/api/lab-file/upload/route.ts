import { NextResponse, type NextRequest } from "next/server";

import { requireDoctorOrPatient } from "@/lib/require-clinical-access";
import { saveLabFile } from "@/lib/storage";
import { sanitizeFileName } from "@/lib/sanitize-filename";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, type AllowedMimeType } from "@/lib/lab-upload-constraints";

export const runtime = "nodejs";

/**
 * Receives a lab-document upload (multipart form-data: `file`, `patientId`)
 * and writes it to the storage volume. This route — not the client — is
 * the real MIME + size boundary now (the old Supabase bucket enforced it
 * server-side; nothing else can).
 *
 * The object key is `<patientId>/<timestamp>-<sanitized-name>`, matching
 * the `lab_reports.file_path` CHECK. Recording the metadata row is a
 * separate step (actions/record-lab-report.ts).
 */
export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const patientId = form.get("patientId");
  const file = form.get("file");

  if (typeof patientId !== "string" || !/^[0-9a-f-]{36}$/i.test(patientId)) {
    return NextResponse.json({ error: "Invalid patient id." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const access = await requireDoctorOrPatient(patientId);
  if (!access.authorized) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return NextResponse.json(
      { error: "Only PDF, JPEG, or PNG files are allowed." },
      { status: 415 },
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File is too large — max ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB.` },
      { status: 413 },
    );
  }

  const filePath = `${patientId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    await saveLabFile(filePath, bytes);
  } catch (err) {
    console.error("[lab-file/upload] save failed", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ filePath });
}
