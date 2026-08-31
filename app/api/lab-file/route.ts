import { NextResponse, type NextRequest } from "next/server";

import { query } from "@/lib/db";
import { requireDoctorOrPatient } from "@/lib/require-clinical-access";
import { labFileExists, readLabFile, verifyDownloadToken } from "@/lib/storage";

export const runtime = "nodejs";

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

function guessMime(filePath: string): string {
  const dot = filePath.lastIndexOf(".");
  return dot === -1 ? "application/octet-stream" : (MIME_BY_EXT[filePath.slice(dot).toLowerCase()] ?? "application/octet-stream");
}

/**
 * Streams a lab document. Guards, in order:
 *  1. The 60-second HMAC token (minted by actions/get-lab-download-url.ts).
 *  2. The session — the caller must be the doctor_admin or the owning patient.
 *  3. A matching lab_reports row for (patient_id, file_path).
 * All three must pass. This replaces Supabase's signed-URL + storage RLS.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const payload = verifyDownloadToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Link expired or invalid." }, { status: 403 });
  }

  const access = await requireDoctorOrPatient(payload.patientId);
  if (!access.authorized) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  const { rows } = await query<{ file_path: string }>(
    `select file_path from public.lab_reports where patient_id = $1 and file_path = $2`,
    [payload.patientId, payload.filePath],
  );
  if (!rows[0] || !labFileExists(payload.filePath)) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readLabFile(payload.filePath);
  } catch (err) {
    console.error("[lab-file] read failed", err);
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const downloadName = payload.filePath.split("/").pop() ?? "lab-document";
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": guessMime(payload.filePath),
      "Content-Disposition": `attachment; filename="${downloadName.replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
    },
  });
}
