"use client";

import imageCompression from "browser-image-compression";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { deleteOrphanLabFile, recordLabReport } from "@/actions/record-lab-report";
import { searchLabTests } from "@/actions/search-lab-tests";
import { CatalogCombobox } from "@/components/catalog-combobox";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, type AllowedMimeType } from "@/lib/lab-upload-constraints";

const IMAGE_TYPES = new Set<AllowedMimeType>(["image/jpeg", "image/png"]);

type LabUploaderProps = {
  /** The patient this report belongs to — the patient's own id when a
   * patient is uploading their own report, or the id from the route when
   * a doctor is uploading on a patient's behalf. RLS enforces this
   * regardless of what's passed here; see requireDoctorOrPatient. */
  patientId: string;
  onUploaded?: () => void;
};

type Phase = "idle" | "compressing" | "uploading" | "saving";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Upload lab report",
  compressing: "Compressing…",
  uploading: "Uploading…",
  saving: "Saving…",
};

export function LabUploader({ patientId, onUploaded }: LabUploaderProps) {
  const [testName, setTestName] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = phase !== "idle";

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    setSuccess(null);

    if (!selected) {
      setFile(null);
      return;
    }

    // UX validation only. The real, unbypassable enforcement is in the
    // /api/lab-file/upload route (MIME allowlist + 15 MiB) — a hostile
    // client can POST there directly and skip this component, so this
    // only protects honest users from an accidental wrong file.
    if (!ALLOWED_MIME_TYPES.includes(selected.type as AllowedMimeType)) {
      setError("Only PDF, JPEG, or PNG files are allowed.");
      setFile(null);
      event.target.value = "";
      return;
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is too large — max ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB.`);
      setFile(null);
      event.target.value = "";
      return;
    }

    setFile(selected);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (testName.trim().length < 2) {
      setError("Enter a test name.");
      return;
    }

    let fileToUpload: File | Blob = file;

    if (IMAGE_TYPES.has(file.type as AllowedMimeType)) {
      setPhase("compressing");
      try {
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: file.type,
        });
      } catch (compressionError) {
        // Compression is a storage-budget optimization, not a
        // correctness requirement — fall back to the original file
        // rather than blocking the upload entirely. The upload route's
        // size check still protects against an oversized upload.
        console.warn("Image compression failed, uploading original file", compressionError);
        fileToUpload = file;
      }
    }

    setPhase("uploading");
    const uploadForm = new FormData();
    uploadForm.set("patientId", patientId);
    uploadForm.set(
      "file",
      fileToUpload instanceof File
        ? fileToUpload
        : new File([fileToUpload], file.name, { type: file.type }),
    );

    let filePath: string;
    try {
      const res = await fetch("/api/lab-file/upload", { method: "POST", body: uploadForm });
      const body = (await res.json()) as { filePath?: string; error?: string };
      if (!res.ok || !body.filePath) {
        setPhase("idle");
        setError(body.error || "Upload failed. Please try again.");
        return;
      }
      filePath = body.filePath;
    } catch {
      setPhase("idle");
      setError("Upload failed. Please try again.");
      return;
    }

    setPhase("saving");
    const result = await recordLabReport({
      patientId,
      filePath,
      testName: testName.trim(),
      notes: notes.trim() || undefined,
    });

    if (result.status !== "success") {
      // The file was written but has no metadata row — clean it up rather
      // than leaving an orphaned, untracked object.
      await deleteOrphanLabFile(patientId, filePath);
      setPhase("idle");
      setError(result.message ?? "Failed to save the lab report.");
      return;
    }

    setPhase("idle");
    setSuccess(result.message ?? "Lab report uploaded.");
    setFile(null);
    setTestName("");
    setNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onUploaded?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
      <div>
        <span className="block text-sm font-medium text-neutral-700">Test / scan name</span>
        {/* The same picker the doctor orders from, so a result gets filed
            under the name it was ordered under instead of a near-miss
            ("FBC" vs "Full blood count"). Covers labs, imaging, and
            procedures alike. Free text still works. */}
        <div className="mt-1 flex">
          <CatalogCombobox
            ariaLabel="Test / scan name"
            placeholder="e.g. Full blood count, Chest X-ray"
            search={searchLabTests}
            value={testName}
            onTextChange={setTestName}
            onSelect={(match) => setTestName(match.label)}
            disabled={busy}
          />
        </div>
      </div>

      <div>
        <label htmlFor="lab-notes" className="block text-sm font-medium text-neutral-700">
          Notes (optional)
        </label>
        <textarea
          id="lab-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
          rows={2}
          className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="lab-file" className="block text-sm font-medium text-neutral-700">
          File (PDF, JPEG, or PNG)
        </label>
        <input
          id="lab-file"
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          onChange={handleFileChange}
          disabled={busy}
          className="mt-1 w-full text-sm"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-green-600">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !file}
        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {PHASE_LABEL[phase]}
      </button>
    </form>
  );
}
