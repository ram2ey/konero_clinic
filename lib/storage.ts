import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Lab-document storage on a local disk volume — replaces Supabase Storage.
 *
 * Object keys keep the old convention `<patientId>/<timestamp>-<name>`, so
 * `lab_reports.file_path` (and its `LIKE patient_id || '/%'` CHECK) works
 * unchanged. In production STORAGE_DIR points at a mounted persistent
 * volume; locally it defaults to ./.lab-documents (gitignored).
 */

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || "./.lab-documents");

const DOWNLOAD_SECRET = process.env.SESSION_COOKIE_SECRET;
if (!DOWNLOAD_SECRET) {
  throw new Error("SESSION_COOKIE_SECRET is not set — it signs lab-file download tokens.");
}

/**
 * Resolves an object key to an absolute path and asserts it stays inside
 * STORAGE_DIR/<firstSegment>/ — defense in depth against `..` traversal.
 * `filePath` is always `<patientId>/<file>`.
 */
function resolveKey(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("..") || normalized.startsWith("/")) {
    throw new Error("invalid file path");
  }
  const abs = path.resolve(STORAGE_DIR, normalized);
  if (abs !== STORAGE_DIR && !abs.startsWith(STORAGE_DIR + path.sep)) {
    throw new Error("path escapes storage root");
  }
  return abs;
}

export async function saveLabFile(filePath: string, bytes: Buffer): Promise<void> {
  const abs = resolveKey(filePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, bytes, { flag: "wx" }); // wx: fail if it already exists
}

export async function readLabFile(filePath: string): Promise<Buffer> {
  return readFile(resolveKey(filePath));
}

export function labFileExists(filePath: string): boolean {
  try {
    return existsSync(resolveKey(filePath));
  } catch {
    return false;
  }
}

export async function deleteLabFile(filePath: string): Promise<void> {
  try {
    await unlink(resolveKey(filePath));
  } catch {
    // already gone — fine
  }
}

// ---------------------------------------------------------------------------
// Short-lived download tokens (replaces Supabase createSignedUrl).
// token = base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload))
// ---------------------------------------------------------------------------

const TOKEN_TTL_SECONDS = 60;

type TokenPayload = { filePath: string; patientId: string; exp: number };

function sign(data: string): string {
  return createHmac("sha256", DOWNLOAD_SECRET!).update(data).digest("base64url");
}

export function createDownloadToken(filePath: string, patientId: string): string {
  const payload: TokenPayload = {
    filePath,
    patientId,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyDownloadToken(token: string): TokenPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (typeof payload.filePath !== "string" || typeof payload.patientId !== "string") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
