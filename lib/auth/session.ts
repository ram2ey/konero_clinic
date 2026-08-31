import "server-only";

import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";

import { query } from "@/lib/db";

/**
 * Hand-rolled session layer — replaces Supabase Auth (GoTrue) + the old
 * `lib/auth-cache.ts`.
 *
 * A session is an opaque 256-bit random token stored in `public.sessions`
 * and carried in an httpOnly cookie. `getSessionUser()` joins it back to
 * `users` + `profiles` and is the single source of truth for "who is this
 * request" everywhere in the app.
 */

const COOKIE_NAME = "session";
const SESSION_TTL_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  role: "doctor_admin" | "patient";
  fullName: string | null;
  mustChangePassword: boolean;
};

type SessionRow = {
  id: string;
  email: string;
  role: "doctor_admin" | "patient";
  full_name: string | null;
  must_change_password: boolean;
};

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Creates a session for `userId`, writes the cookie, and opportunistically
 * sweeps expired rows (cheap, self-pruning — same pattern the throttle
 * tables use, no cron needed).
 */
export async function createSession(userId: string): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `insert into public.sessions (token, user_id, expires_at) values ($1, $2, $3)`,
    [token, userId, expiresAt.toISOString()],
  );
  // Best-effort cleanup; never block login on it.
  query(`delete from public.sessions where expires_at < now()`).catch(() => {});

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

/**
 * Resolves the current request's user, or null. Request-cached so the
 * root layout, a sub-layout and a page component share one round trip.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const { rows } = await query<SessionRow>(
    `select u.id, u.email, u.must_change_password, p.role, p.full_name
       from public.sessions s
       join public.users u on u.id = s.user_id
       join public.profiles p on p.id = u.id
      where s.token = $1 and s.expires_at > now()`,
    [token],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    fullName: row.full_name,
    mustChangePassword: row.must_change_password,
  };
});

/** Deletes the current session row and clears the cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await query(`delete from public.sessions where token = $1`, [token]).catch(() => {});
  }
  cookieStore.delete(COOKIE_NAME);
}
